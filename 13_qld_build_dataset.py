from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
DATASET_PAGE_URL = "https://www.data.qld.gov.au/dataset/0d7eee4a-2990-4195-9d3b-89f4af818e32"
DATASET_CSV_URL = "https://www.data.qld.gov.au/dataset/0d7eee4a-2990-4195-9d3b-89f4af818e32/resource/5b39065c-df32-415c-994c-5ff12f8de997/download/centredetails_may_2020.csv"
OUT_CSV = ROOT / "outputs" / "schools_qld_contacts.csv"
OUT_SQLITE = ROOT / "outputs" / "schools_qld_contacts.sqlite"


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


def map_sector(sector: str | None, non_state_sector: str | None) -> str:
    s = str(sector or "").strip().lower()
    n = str(non_state_sector or "").strip().lower()
    if s == "nan":
        s = ""
    if n == "nan":
        n = ""
    if s == "state":
        return "government"
    if n.startswith("cath"):
        return "catholic"
    if n.startswith("ind"):
        return "independent"
    return "independent" if s == "non-state" else "unknown"


def clean_str(value: object) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return None if not s or s.lower() == "nan" else s


def save_sqlite(df: pd.DataFrame, db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        df.to_sql("schools_contacts", conn, if_exists="replace", index=False)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_school_name ON schools_contacts (school_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_suburb ON schools_contacts (suburb)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lat_lon ON schools_contacts (lat, lon)")
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    raw = pd.read_csv(DATASET_CSV_URL, dtype=str)
    raw = raw[raw["Centre Status"].fillna("").str.upper() == "OPEN"].copy()

    suburb = raw["Actual Address Line 3"].where(
        raw["Actual Address Line 3"].fillna("").str.strip() != "", raw["Statistical Area Level2"]
    )

    out = pd.DataFrame(
        {
            "sector": [map_sector(s, n) for s, n in zip(raw["Sector"], raw["Non-State Sector"])],
            "school_name": raw["Centre Name"].astype(str).str.strip(),
            "suburb": suburb.astype(str).str.strip().str.title(),
            "postcode": raw["Actual Address Post Code"].astype(str).str.strip(),
            "phone": raw["Phone Number"].map(clean_str),
            "public_email": None,
            "contact_form_url": None,
            "website_url": raw["Internet Site"].map(ensure_http),
            "source_directory_url": DATASET_PAGE_URL,
            "last_verified_date": date.today().isoformat(),
            "lat": pd.to_numeric(raw["Latitude"], errors="coerce"),
            "lon": pd.to_numeric(raw["Longitude"], errors="coerce"),
            "website_checked": "false",
        }
    )

    out = out.drop_duplicates(subset=["school_name", "suburb"], keep="first")
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT_CSV, index=False)
    save_sqlite(out, OUT_SQLITE)

    print(f"QLD schools saved: {len(out)} -> {OUT_CSV}")
    print(f"QLD sqlite saved: {OUT_SQLITE}")


if __name__ == "__main__":
    main()
