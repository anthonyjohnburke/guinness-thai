#!/usr/bin/env python3
"""Build the public pubs.json dataset from the Pints of Bangkok Google Sheet."""

import json
import urllib.request
from pathlib import Path

SHEET_URL = "https://opensheet.elk.sh/1FENGaj61vr2_6BWbqnYL7k6lkANGIdcBpRciPQU3SOI/Sheet1"
OUTPUT = Path(__file__).resolve().parents[1] / "pubs.json"


def text(value):
    value = (value or "").strip()
    return value or None


def number(value, *, integer=False):
    value = text(value)
    if value is None:
        return None
    parsed = float(value.replace(",", ""))
    return int(parsed) if integer else parsed


def transform(pub):
    return {
        "name": text(pub.get("name")),
        "area": text(pub.get("area")),
        "type": text(pub.get("type")),
        "guinness_draught": True,
        "price_thb": number(pub.get("price"), integer=True),
        "happy_hour_price_thb": number(pub.get("happy_hour_price"), integer=True),
        "special": text(pub.get("special")),
        "nearest_station": text(pub.get("nearest_station")),
        "station_distance_metres": number(pub.get("station_distance"), integer=True),
        "latitude": number(pub.get("lat")),
        "longitude": number(pub.get("lon")),
        "google_maps_url": text(pub.get("google_maps_link")),
        "venue_url": text(pub.get("link")),
        "price_verified": text(pub.get("last_updated")),
    }


def main():
    request = urllib.request.Request(
        SHEET_URL,
        headers={"User-Agent": "Pints-of-Bangkok-pubs-json/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        rows = json.load(response)

    pubs = [transform(row) for row in rows if text(row.get("name"))]
    OUTPUT.write_text(
        json.dumps(pubs, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(pubs)} pubs to {OUTPUT}")


if __name__ == "__main__":
    main()
