from __future__ import annotations

import argparse
import logging
from datetime import date
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd
import yaml
from bs4 import BeautifulSoup

from utils.extractors import (
    choose_general_email,
    classify_public_email,
    extract_cloudflare_protected_emails,
    extract_emails_from_text,
    extract_mailto_emails,
)
from utils.http_client import EthicalHttpClient, HttpConfig

ROOT = Path(__file__).resolve().parent
CONFIG = yaml.safe_load((ROOT / "config.yml").read_text())

STATE_CSV = {
    "nsw": ROOT / "outputs" / "schools_nsw_contacts.csv",
    "vic": ROOT / "outputs" / "schools_vic_contacts.csv",
    "qld": ROOT / "outputs" / "schools_qld_contacts.csv",
    "wa": ROOT / "outputs" / "schools_wa_contacts.csv",
    "tas": ROOT / "outputs" / "schools_tas_contacts.csv",
    "sa": ROOT / "outputs" / "schools_sa_contacts.csv",
    "act": ROOT / "outputs" / "schools_act_contacts.csv",
}


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


def clean_text(value: object) -> str:
    if value is None:
        return ""
    s = str(value).strip()
    return "" if not s or s.lower() == "nan" else s


def candidate_contact_urls(soup: BeautifulSoup, base_url: str) -> list[str]:
    candidates: list[str] = []
    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        label = (a.get_text(" ", strip=True) or "").lower()
        if not href:
            continue
        if href.lower().startswith(("mailto:", "javascript:", "tel:")):
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


def extract_strict_email(soup: BeautifulSoup, base_url: str) -> str | None:
    mailto_emails = extract_mailto_emails(soup)
    cloudflare_emails = extract_cloudflare_protected_emails(soup)
    text_emails = extract_emails_from_text(soup.get_text("\n", strip=True))

    # High confidence order only.
    email = (
        choose_general_email(mailto_emails, website_url=base_url, source="mailto")
        or choose_general_email(cloudflare_emails, website_url=base_url, source="cloudflare")
        or choose_general_email(text_emails, website_url=base_url, source="text")
    )
    if not email:
        return None

    normalised, status, _ = classify_public_email(email, website_url=base_url, source="text")
    return normalised if status == "valid" else None


def recover_state(state: str, max_sites: int, checkpoint_every: int) -> None:
    in_csv = STATE_CSV[state]
    if not in_csv.exists():
        print(f"[{state}] missing CSV: {in_csv}")
        return

    scrape_logger, error_logger = build_loggers()
    df = pd.read_csv(in_csv, dtype=str)

    for c in ["public_email", "website_url"]:
        if c not in df.columns:
            df[c] = ""

    if "recovery_checked" not in df.columns:
        df["recovery_checked"] = "false"

    df["website_url"] = df["website_url"].map(ensure_http)

    http_cfg = HttpConfig(
        user_agent=CONFIG["user_agent"],
        request_delay_seconds=CONFIG["request_delay_seconds"],
        timeout_seconds=min(int(CONFIG["timeout_seconds"]), 10),
        max_retries=1,
        backoff_factor=0.5,
    )
    client = EthicalHttpClient(http_cfg, scrape_logger=scrape_logger)

    attempted = 0
    recovered = 0

    try:
        for i, row in df.iterrows():
            website = ensure_http(row.get("website_url"))
            current_email = clean_text(row.get("public_email"))
            checked = str(row.get("recovery_checked") or "").strip().lower() == "true"

            if not website or current_email or checked:
                continue

            if max_sites and attempted >= max_sites:
                break
            attempted += 1

            try:
                r = client.get(website)
                if r.status_code >= 400:
                    df.at[i, "recovery_checked"] = "true"
                    continue

                soup = BeautifulSoup(r.text, "lxml")
                email = extract_strict_email(soup, website)

                if not email:
                    for cu in candidate_contact_urls(soup, website):
                        try:
                            cr = client.get(cu)
                            if cr.status_code >= 400:
                                continue
                            cs = BeautifulSoup(cr.text, "lxml")
                            email = extract_strict_email(cs, cu)
                            if email:
                                break
                        except Exception:
                            continue

                if email:
                    df.at[i, "public_email"] = email
                    recovered += 1

                df.at[i, "recovery_checked"] = "true"
            except Exception as exc:
                df.at[i, "recovery_checked"] = "true"
                error_logger.exception("[%s] safe recovery failed (%s): %s", state, website, exc)

            if attempted % checkpoint_every == 0:
                df["last_verified_date"] = date.today().isoformat()
                df.to_csv(in_csv, index=False)
                print(f"[{state}] attempted={attempted} recovered={recovered} (checkpoint)", flush=True)
    except KeyboardInterrupt:
        print(f"[{state}] interrupted; saving progress...", flush=True)
    finally:
        df["last_verified_date"] = date.today().isoformat()
        df.to_csv(in_csv, index=False)

    print(f"[{state}] complete attempted={attempted} recovered={recovered} saved={in_csv}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Recover high-confidence public emails from school websites")
    parser.add_argument("--states", nargs="+", default=["nsw", "vic", "qld", "wa"])
    parser.add_argument("--max-sites", type=int, default=0)
    parser.add_argument("--checkpoint-every", type=int, default=100)
    args = parser.parse_args()

    for s in args.states:
        code = s.strip().lower()
        if code not in STATE_CSV:
            print(f"[{code}] skipped (unknown)")
            continue
        recover_state(code, args.max_sites, args.checkpoint_every)


if __name__ == "__main__":
    main()
