#!/usr/bin/env python3
"""Build the public pubs.json and pubs.html files from the Pints of Bangkok Google Sheet."""

import html
import json
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]

SHEET_URL = "https://opensheet.elk.sh/1FENGaj61vr2_6BWbqnYL7k6lkANGIdcBpRciPQU3SOI/Sheet1"

JSON_OUTPUT = ROOT / "pubs.json"
HTML_OUTPUT = ROOT / "pubs.html"


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


def esc(value):
    if value is None:
        return ""
    return html.escape(str(value), quote=True)


def build_pub_html(pub):
    facts = []

    if pub["area"]:
        facts.append(
            f"<dt>Area</dt><dd>{esc(pub['area'])}</dd>"
        )

    if pub["type"]:
        facts.append(
            f"<dt>Venue type</dt><dd>{esc(pub['type'])}</dd>"
        )

    if pub["price_thb"] is not None:
        facts.append(
            f"<dt>Guinness Draught price</dt><dd>฿{pub['price_thb']}</dd>"
        )
    else:
        facts.append(
            "<dt>Guinness Draught price</dt><dd>Price not currently listed</dd>"
        )

    if pub["happy_hour_price_thb"] is not None:
        facts.append(
            f"<dt>Happy hour price</dt><dd>฿{pub['happy_hour_price_thb']}</dd>"
        )

    if pub["special"]:
        facts.append(
            f"<dt>Deal or special</dt><dd>{esc(pub['special'])}</dd>"
        )

    if pub["nearest_station"]:
        station = esc(pub["nearest_station"])

        if pub["station_distance_metres"] is not None:
            station += f" ({pub['station_distance_metres']} m)"

        facts.append(
            f"<dt>Nearest station</dt><dd>{station}</dd>"
        )

    if pub["price_verified"]:
        facts.append(
            f"<dt>Price verified</dt><dd>{esc(pub['price_verified'])}</dd>"
        )

    links = []

    if pub["google_maps_url"]:
        links.append(
            f'<a href="{esc(pub["google_maps_url"])}" '
            'target="_blank" rel="noopener noreferrer">View on Google Maps</a>'
        )

    if pub["venue_url"]:
        links.append(
            f'<a href="{esc(pub["venue_url"])}" '
            'target="_blank" rel="noopener noreferrer">Venue website</a>'
        )

    links_html = ""

    if links:
        links_html = '<p class="pub-links">' + " · ".join(links) + "</p>"

    return f"""
      <article class="pub">
        <h2>{esc(pub["name"])}</h2>
        <dl>
          {''.join(facts)}
        </dl>
        {links_html}
      </article>
    """
def build_test_structured_data(pubs):
    test_pub = next(
        (
            pub for pub in pubs
            if (pub["name"] or "").strip().lower() == "the black swan"
        ),
        None,
    )

    if not test_pub:
        return ""

    data = {
        "@context": "https://schema.org",
        "@type": "BarOrPub",
        "name": test_pub["name"],
    }

    if (
        test_pub["latitude"] is not None
        and test_pub["longitude"] is not None
    ):
        data["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": test_pub["latitude"],
            "longitude": test_pub["longitude"],
        }

    if test_pub["venue_url"]:
        data["url"] = test_pub["venue_url"]

    if test_pub["price_thb"] is not None:
        data["hasMenu"] = {
            "@type": "Menu",
            "hasMenuItem": {
                "@type": "MenuItem",
                "name": "Guinness Draught",
                "offers": {
                    "@type": "Offer",
                    "price": test_pub["price_thb"],
                    "priceCurrency": "THB",
                },
            },
        }

    json_ld = json.dumps(
        data,
        ensure_ascii=False,
        indent=2,
    )

    return f"""
  <script type="application/ld+json">
{json_ld}
  </script>
"""

def build_html(pubs):
    updated = datetime.now(
        ZoneInfo("Asia/Bangkok")
    ).date().isoformat()

    structured_data = build_test_structured_data(pubs)

    pub_blocks = "\n".join(
        build_pub_html(pub)
        for pub in sorted(
            pubs,
            key=lambda item: (item["name"] or "").lower()
        )
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Bangkok Guinness Pub List | Prices & Verification Dates | Pints of Bangkok</title>

  <meta
    name="description"
    content="Browse Bangkok pubs serving Guinness Draught, with pint prices, happy hour deals, nearby stations and price verification dates."
  >

  <meta name="robots" content="index, follow">

  <link rel="canonical" href="https://www.guinnessthailand.com/pubs.html">
  <link rel="alternate" type="application/json" href="/pubs.json" title="Pints of Bangkok pub data">

{structured_data}

  <style>
    body {{
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      line-height: 1.5;
      color: #222;
    }}

    a {{
      color: inherit;
    }}

    header {{
      margin-bottom: 32px;
    }}

    .pub {{
      padding: 20px 0;
      border-top: 1px solid #ddd;
    }}

    .pub h2 {{
      margin: 0 0 12px;
    }}

    dl {{
      display: grid;
      grid-template-columns: minmax(150px, 220px) 1fr;
      gap: 6px 16px;
      margin: 0;
    }}

    dt {{
      font-weight: bold;
    }}

    dd {{
      margin: 0;
    }}

    .pub-links {{
      margin-bottom: 0;
    }}

    footer {{
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 0.9rem;
    }}

    @media (max-width: 600px) {{
      dl {{
        grid-template-columns: 1fr;
      }}

      dd {{
        margin-bottom: 8px;
      }}
    }}
  </style>
</head>

<body>

  <header>
    <p><a href="/">Pints of Bangkok</a></p>

    <h1>Bangkok Guinness Pub List</h1>

    <p>
      A directory of Bangkok venues tracked by Pints of Bangkok, including Guinness Draught prices, happy hour deals, nearby transport and price verification dates.
    </p>

    <p>
      <strong>{len(pubs)} pubs currently listed.</strong>
      Data last generated: {updated}.
    </p>
  </header>

  <main>
{pub_blocks}
  </main>

  <footer>
    <p>
      Prices may change at any time. Verification dates show when a listed
      price was most recently checked by Pints of Bangkok.
    </p>

    <p>
      <a href="/">Return to the interactive Pints of Bangkok map and rankings</a>
    </p>
  </footer>

</body>
</html>
"""


def main():
    request = urllib.request.Request(
        SHEET_URL,
        headers={"User-Agent": "Pints-of-Bangkok-pub-data/1.0"},
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        rows = json.load(response)

    pubs = [
        transform(row)
        for row in rows
        if text(row.get("name"))
    ]

    JSON_OUTPUT.write_text(
        json.dumps(
            pubs,
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )

    HTML_OUTPUT.write_text(
        build_html(pubs),
        encoding="utf-8",
    )

    print(f"Wrote {len(pubs)} pubs to {JSON_OUTPUT}")
    print(f"Wrote {len(pubs)} pubs to {HTML_OUTPUT}")


if __name__ == "__main__":
    main()
