from __future__ import annotations

import argparse
import json
import logging
import subprocess
from datetime import date
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd
import requests
import yaml
from bs4 import BeautifulSoup

from utils.extractors import (
    choose_general_email,
    extract_cloudflare_protected_emails,
    extract_contact_form_url,
    extract_emails_from_text,
    extract_mailto_emails,
)
from utils.http_client import EthicalHttpClient, HttpConfig

ROOT = Path(__file__).resolve().parent
CONFIG = yaml.safe_load((ROOT / "config.yml").read_text())
IN_CSV = ROOT / "outputs" / "schools_nt_contacts.csv"
OUT_CSV = IN_CSV
NT_DIR_BASE = "https://directory.ntschools.net"
NT_DIR_ALL_SCHOOLS_API = f"{NT_DIR_BASE}/api/System/GetAllSchools"
NT_DIR_SCHOOL_API = f"{NT_DIR_BASE}/api/System/GetSchool?itSchoolCode={{code}}"
LOW_QUALITY_WEBSITE_HOSTS = (
    "teachintheterritory.nt.gov.au",
    "directory.ntschools.net",
    "web.ntschools.net",
)


def build_loggers() -> tuple[logging.Logger, logging.Logger]:
    logging_cfg = CONFIG["logging"]
    scrape_logger = logging.getLogger("scrape")
    scrape_logger.setLevel(logging.INFO)
    if not scrape_logger.handlers:
        fh = logging.FileHandler(ROOT / logging_cfg["scrape_log"])
        fh.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
        scrape_logger.addHandler(fh)

    error_logger = logging.getLogger("errors")
    error_logger.setLevel(logging.ERROR)
    if not error_logger.handlers:
        eh = logging.FileHandler(ROOT / logging_cfg["error_log"])
        eh.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
        error_logger.addHandler(eh)
    return scrape_logger, error_logger


def ensure_http(url: str | None) -> str | None:
    if not url:
        return None
    s = str(url).strip()
    if not s or s.lower() == "nan":
        return None
    if s.startswith("//"):
        return "https:" + s
    if s.startswith("http://") or s.startswith("https://"):
        return s
    return "https://" + s


def norm_name(value: str | None) -> str:
    s = (value or "").strip().lower()
    return "".join(ch for ch in s if ch.isalnum())


def get_with_tls_fallback(
    client: EthicalHttpClient,
    url: str,
    error_logger: logging.Logger,
) -> tuple[int | None, str | None]:
    try:
        resp = client.get(url)
        return int(resp.status_code), resp.text
    except PermissionError as exc:
        error_logger.error("Blocked by robots.txt for %s: %s", url, exc)
        return None, None
    except requests.exceptions.SSLError as exc:
        error_logger.error("SSL failed via requests for %s; trying curl fallback: %s", url, exc)
        try:
            cmd = [
                "curl",
                "-L",
                "-sS",
                "--max-time",
                str(int(CONFIG["timeout_seconds"])),
                "-A",
                CONFIG["user_agent"],
                url,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if result.returncode != 0:
                error_logger.error("curl fallback failed (%s): %s", url, (result.stderr or "").strip())
                return None, None
            return 200, result.stdout
        except Exception as curl_exc:
            error_logger.error("curl fallback exception (%s): %s", url, curl_exc)
            return None, None


def enrich_from_nt_directory(
    df: pd.DataFrame,
    client: EthicalHttpClient,
    error_logger: logging.Logger,
) -> tuple[pd.DataFrame, int]:
    count = 0
    status_code, all_schools_html = get_with_tls_fallback(client, NT_DIR_ALL_SCHOOLS_API, error_logger=error_logger)
    if not all_schools_html or (status_code is not None and status_code >= 400):
        return df, count

    try:
        all_schools = json.loads(all_schools_html)
    except Exception as exc:
        error_logger.error("NT directory list parse failed: %s", exc)
        return df, count

    code_by_name = {}
    for item in all_schools:
        school_name = str(item.get("schoolName") or "").strip()
        it_code = str(item.get("itSchoolCode") or "").strip()
        if school_name and it_code:
            code_by_name[norm_name(school_name)] = it_code

    for i, row in df.iterrows():
        school_name = str(row.get("school_name") or "").strip()
        if not school_name:
            continue
        existing_email = str(row.get("public_email") or "").strip()
        existing_phone = str(row.get("phone") or "").strip()
        website_url = ensure_http(row.get("website_url"))
        needs_website_replacement = bool(
            website_url
            and any(host in website_url.lower() for host in LOW_QUALITY_WEBSITE_HOSTS)
        )
        if existing_email and existing_email.lower() != "nan" and existing_phone and existing_phone.lower() != "nan" and not needs_website_replacement:
            continue

        code = code_by_name.get(norm_name(school_name))
        if not code:
            continue

        details_url = NT_DIR_SCHOOL_API.format(code=code)
        d_status_code, details_html = get_with_tls_fallback(client, details_url, error_logger=error_logger)
        if not details_html or (d_status_code is not None and d_status_code >= 400):
            continue

        try:
            details = json.loads(details_html)
        except Exception:
            continue

        mail = choose_general_email(
            [str(details.get("mail") or "").strip()],
            website_url=website_url,
            source="directory",
        )
        phone = str(details.get("telephoneNumber") or "").strip()
        uri = ensure_http(details.get("uri"))

        if mail and (not existing_email or existing_email.lower() == "nan"):
            df.at[i, "public_email"] = mail
            count += 1
        if phone and (not existing_phone or existing_phone.lower() == "nan"):
            df.at[i, "phone"] = phone
        if uri and (not website_url or needs_website_replacement):
            df.at[i, "website_url"] = uri

    return df, count


def enrich_from_homepage(client: EthicalHttpClient, website_url: str) -> tuple[str | None, str | None]:
    def extract_from_soup(soup: BeautifulSoup, base_url: str) -> tuple[str | None, str | None]:
        all_text = soup.get_text("\n", strip=True)
        mailto_emails = extract_mailto_emails(soup)
        cloudflare_emails = extract_cloudflare_protected_emails(soup)
        text_emails = extract_emails_from_text(all_text)
        email = (
            choose_general_email(mailto_emails, website_url=base_url, source="mailto")
            or choose_general_email(cloudflare_emails, website_url=base_url, source="cloudflare")
            or choose_general_email(text_emails, website_url=base_url, source="text")
        )
        form_url = extract_contact_form_url(soup, base_url)
        return email, form_url

    def candidate_contact_urls(soup: BeautifulSoup, base_url: str) -> list[str]:
        candidates: list[str] = []
        for a in soup.select("a[href]"):
            href = (a.get("href") or "").strip()
            label = (a.get_text(" ", strip=True) or "").lower()
            if not href:
                continue
            if "contact" in href.lower() or "contact" in label:
                candidates.append(urljoin(base_url, href))
        for path in [
            "/contact",
            "/contact-us",
            "/contactus",
            "/about/contact",
            "/about-us/contact",
            "/enrolments",
        ]:
            candidates.append(urljoin(base_url, path))

        seen = set()
        out = []
        for u in candidates:
            key = u.lower().rstrip("/")
            if key in seen:
                continue
            seen.add(key)
            out.append(u)
        return out[:8]

    try:
        status_code, html = get_with_tls_fallback(client, website_url, error_logger=logging.getLogger("errors"))
        if not html or (status_code is not None and status_code >= 400):
            return None, None
        soup = BeautifulSoup(html, "lxml")
        email, form_url = extract_from_soup(soup, website_url)
        if email and form_url:
            return email, form_url

        for cu in candidate_contact_urls(soup, website_url):
            try:
                c_status_code, c_html = get_with_tls_fallback(client, cu, error_logger=logging.getLogger("errors"))
                if not c_html or (c_status_code is not None and c_status_code >= 400):
                    continue
                cs = BeautifulSoup(c_html, "lxml")
                ce, cf = extract_from_soup(cs, cu)
                if ce and not email:
                    email = ce
                if cf and not form_url:
                    form_url = cf
                if email and form_url:
                    break
            except Exception:
                continue
        return email, form_url
    except Exception:
        return None, None


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich NT contacts from official school websites")
    parser.add_argument("--max-sites", type=int, default=0, help="Optional limit of website rows to process (0=all)")
    parser.add_argument("--checkpoint-every", type=int, default=50, help="Save CSV every N attempted rows")
    args = parser.parse_args()

    scrape_logger, error_logger = build_loggers()
    df = pd.read_csv(IN_CSV, dtype=str)
    for c in ["public_email", "contact_form_url", "website_url", "website_checked"]:
        if c not in df.columns:
            df[c] = None
    df["website_checked"] = df["website_checked"].fillna("false").astype(str)
    df["website_url"] = df["website_url"].map(ensure_http)

    http_cfg = HttpConfig(
        user_agent=CONFIG["user_agent"],
        request_delay_seconds=CONFIG["request_delay_seconds"],
        timeout_seconds=min(int(CONFIG["timeout_seconds"]), 7),
        max_retries=0,
        backoff_factor=0.0,
    )
    client = EthicalHttpClient(http_cfg, scrape_logger=scrape_logger)

    df, dir_added = enrich_from_nt_directory(df, client=client, error_logger=error_logger)
    if dir_added:
        print(f"NT directory enrichment added {dir_added} emails", flush=True)

    processed = 0
    attempted = 0
    try:
        for i, row in df.iterrows():
            website = ensure_http(row.get("website_url"))
            if not website:
                continue
            if str(row.get("website_checked") or "").strip().lower() == "true":
                continue
            if args.max_sites and attempted >= args.max_sites:
                break
            attempted += 1

            existing_email = str(row.get("public_email") or "").strip()
            existing_form = str(row.get("contact_form_url") or "").strip()
            try:
                email, form_url = enrich_from_homepage(client, website)
                if email and (not existing_email or existing_email.lower() == "nan"):
                    df.at[i, "public_email"] = email
                if form_url and (not existing_form or existing_form.lower() == "nan"):
                    df.at[i, "contact_form_url"] = form_url
                df.at[i, "website_checked"] = "true"
                processed += 1
            except Exception as exc:
                df.at[i, "website_checked"] = "true"
                error_logger.exception("NT website enrichment failed (%s): %s", website, exc)

            if attempted % args.checkpoint_every == 0:
                df["last_verified_date"] = date.today().isoformat()
                df.to_csv(OUT_CSV, index=False)
                print(
                    f"NT website enrichment attempted: {attempted}, processed: {processed} (checkpoint saved)",
                    flush=True,
                )
    except KeyboardInterrupt:
        print("NT enrichment interrupted; saving progress...", flush=True)
    finally:
        df["last_verified_date"] = date.today().isoformat()
        df.to_csv(OUT_CSV, index=False)

    print(f"NT website enrichment complete on {processed} rows (attempted {attempted} sites)", flush=True)
    print(f"Saved: {OUT_CSV}")


if __name__ == "__main__":
    main()
