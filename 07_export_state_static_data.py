from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
import pgeocode

ROOT = Path(__file__).resolve().parent


def clean_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return "" if text.lower() == "nan" else text


def normalise_postcode(value: object) -> str:
    text = clean_text(value)
    digits = "".join(ch for ch in text if ch.isdigit())
    if not digits:
        return ""
    return digits.zfill(4)[-4:]


def fill_coords_from_postcode(df: pd.DataFrame) -> pd.DataFrame:
    nomi = pgeocode.Nominatim("au")
    out = df.copy()
    postcodes = out["postcode"].map(normalise_postcode)
    lookup = nomi.query_postal_code(postcodes.tolist())
    out["pc_lat"] = pd.to_numeric(lookup["latitude"], errors="coerce")
    out["pc_lon"] = pd.to_numeric(lookup["longitude"], errors="coerce")
    out["lat"] = pd.to_numeric(out.get("lat"), errors="coerce").fillna(out["pc_lat"])
    out["lon"] = pd.to_numeric(out.get("lon"), errors="coerce").fillna(out["pc_lon"])
    return out.drop(columns=["pc_lat", "pc_lon"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Export state CSV to static docs/data/<state>/ JSON files")
    parser.add_argument("--state", required=True, help="State code, e.g. nsw, vic, qld")
    parser.add_argument("--csv", required=True, help="Input merged CSV path")
    args = parser.parse_args()

    state = args.state.lower().strip()
    in_csv = Path(args.csv).resolve()
    out_dir = ROOT / "docs" / "data" / state
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(in_csv, dtype=str)
    if "lat" not in df.columns or "lon" not in df.columns:
        df["lat"] = None
        df["lon"] = None
    df = fill_coords_from_postcode(df)
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df = df.dropna(subset=["lat", "lon"]).copy()

    schools = []
    for _, row in df.iterrows():
        schools.append(
            {
                "sector": clean_text(row.get("sector")),
                "school_name": clean_text(row.get("school_name")),
                "suburb": clean_text(row.get("suburb")),
                "postcode": normalise_postcode(row.get("postcode")),
                "phone": clean_text(row.get("phone")),
                "public_email": clean_text(row.get("public_email")),
                "contact_form_url": clean_text(row.get("contact_form_url")),
                "website_url": clean_text(row.get("website_url")),
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
            }
        )

    postcode_groups = (
        df.assign(postcode_norm=df["postcode"].map(normalise_postcode))
        .query("postcode_norm != ''")
        .groupby("postcode_norm", as_index=False)[["lat", "lon"]]
        .mean()
    )
    postcode_centroids = {
        str(r["postcode_norm"]): {"lat": float(r["lat"]), "lon": float(r["lon"])}
        for _, r in postcode_groups.iterrows()
    }

    suburb_groups = (
        df.assign(suburb_norm=df["suburb"].fillna("").astype(str).str.strip())
        .query("suburb_norm != ''")
        .groupby("suburb_norm", as_index=False)[["lat", "lon"]]
        .mean()
    )
    suburb_centroids = [
        {"suburb": str(r["suburb_norm"]), "lat": float(r["lat"]), "lon": float(r["lon"])}
        for _, r in suburb_groups.iterrows()
    ]

    (out_dir / "schools.min.json").write_text(
        json.dumps(schools, separators=(",", ":"), ensure_ascii=True), encoding="utf-8"
    )
    (out_dir / "postcode_centroids.min.json").write_text(
        json.dumps(postcode_centroids, separators=(",", ":"), ensure_ascii=True), encoding="utf-8"
    )
    (out_dir / "suburb_centroids.min.json").write_text(
        json.dumps(suburb_centroids, separators=(",", ":"), ensure_ascii=True), encoding="utf-8"
    )

    print(f"Exported {len(schools)} rows to docs/data/{state}/")


if __name__ == "__main__":
    main()
