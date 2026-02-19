from __future__ import annotations

import io
import sqlite3
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
DATASET_PAGE_URL = "https://data.gov.au/data/dataset/baa49c22-79b7-4e65-bb3e-ac8ea91e6787"
DATASET_CSV_URL = "https://www.education.vic.gov.au/Documents/about/research/datavic/dv402-SchoolLocations2025.csv"
OUT_CSV = ROOT / "outputs" / "schools_vic_contacts.csv"
OUT_SQLITE = ROOT / "outputs" / "schools_vic_contacts.sqlite"


def clean_sector(value: str) -> str:
    v = (value or "").strip().lower()
    if v.startswith("gov"):
        return "government"
    if v.startswith("cath"):
        return "catholic"
    if v.startswith("ind"):
        return "independent"
    return v or "unknown"


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
    raw = raw[raw["Address_State"].fillna("").str.upper() == "VIC"].copy()
    raw = raw[raw["School_Status"].fillna("").str.upper() == "O"].copy()

    out = pd.DataFrame(
        {
            "sector": raw["Education_Sector"].map(clean_sector),
            "school_name": raw["School_Name"].astype(str).str.strip(),
            "suburb": raw["Address_Town"].astype(str).str.strip().str.title(),
            "postcode": raw["Address_Postcode"].astype(str).str.strip(),
            "phone": raw["Full_Phone_No"].astype(str).str.strip(),
            "public_email": None,
            "contact_form_url": None,
            "website_url": None,
            "source_directory_url": DATASET_PAGE_URL,
            "last_verified_date": date.today().isoformat(),
            "lat": pd.to_numeric(raw["Y"], errors="coerce"),
            "lon": pd.to_numeric(raw["X"], errors="coerce"),
        }
    )

    out = out.drop_duplicates(subset=["school_name", "suburb"], keep="first")
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT_CSV, index=False)
    save_sqlite(out, OUT_SQLITE)

    print(f"VIC schools saved: {len(out)} -> {OUT_CSV}")
    print(f"VIC sqlite saved: {OUT_SQLITE}")


if __name__ == "__main__":
    main()
