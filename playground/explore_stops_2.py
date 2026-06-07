"""Follow-up: pagination behavior + full Bořislavka group + filter sweeps."""

import json
import os
from collections import Counter

import httpx
from dotenv import load_dotenv
from rich import print
from rich.rule import Rule

load_dotenv(".env.local")
API_KEY = os.environ["GOLEMIO_API_KEY"]
URL = "https://api.golemio.cz/v2/gtfs/stops"


def fetch(params: dict | None = None) -> dict:
    r = httpx.get(
        URL,
        params=params or {},
        headers={"Accept": "application/json", "X-Access-Token": API_KEY},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


# 1. Pagination — default capped at 10000?
print(Rule("[bold]1. Pagination"))
counts = {}
for limit in (10, 100, 10000, 20000):
    j = fetch({"limit": limit})
    counts[limit] = len(j.get("features", []))
print(f"limit -> features returned: {counts}")

# Try offset
offs = fetch({"limit": 5, "offset": 10000})
print(f"limit=5 offset=10000 -> {len(offs.get('features', []))} features")
if offs.get("features"):
    print("Sample at offset 10000:")
    print(json.dumps(offs["features"][0]["properties"], indent=2, ensure_ascii=False))

# Total via paginating with large offset
print(Rule("Walk pagination to find total count"))
total = 0
offset = 0
page = 10000
while True:
    j = fetch({"limit": page, "offset": offset})
    n = len(j.get("features", []))
    total += n
    print(f"  offset={offset} -> {n}")
    if n < page:
        break
    offset += page
    if offset > 100000:
        print("  (stopping safety bail)")
        break
print(f"Total stops in dataset: {total}")

# 2. Full Bořislavka group — see all 15 records
print(Rule("[bold]2. Full names=Bořislavka set"))
b = fetch({"names": "Bořislavka"})
feats = b.get("features", [])
print(f"{len(feats)} features:")
for f in feats:
    p = f["properties"]
    coords = f["geometry"]["coordinates"]
    print(
        f"  stop_id={p['stop_id']:<10} loc_type={p['location_type']} "
        f"platform={p['platform_code']!r:<6} parent={p['parent_station']!r:<10} "
        f"zone={p['zone_id']!r:<5} wheelchair={p['wheelchair_boarding']} "
        f"name={p['stop_name']!r} coords={coords}"
    )

# 3. Filter parameters — try a few common GTFS-ish ones to see what's supported
print(Rule("[bold]3. Filter parameter probe"))
for params in [
    {"ids": "U157S1"},
    {"stopIds": "U157S1"},
    {"aswIds": "1040"},
    {"cisIds": "57"},
    {"latlng": "50.09838,14.36288", "range": 200},
    {"latlng": "50.09838,14.36288", "range": "200"},
    {"names": "Bořislavka", "limit": 3},
]:
    try:
        j = fetch(params)
        n = len(j.get("features", []))
        print(f"  {params} -> {n} features")
    except httpx.HTTPStatusError as e:
        print(f"  {params} -> HTTP {e.response.status_code}: {e.response.text[:120]}")

# 4. location_type meaning — sample one of each non-zero type
print(Rule("[bold]4. Examples by location_type"))
all_data = fetch({"limit": 10000})
samples_by_type: dict[int, dict] = {}
for f in all_data["features"]:
    lt = f["properties"].get("location_type")
    if lt not in samples_by_type:
        samples_by_type[lt] = f
    if len(samples_by_type) >= 5:
        break
for lt, f in sorted(samples_by_type.items(), key=lambda kv: (kv[0] is None, kv[0])):
    print(f"\nlocation_type={lt}:")
    print(json.dumps(f, indent=2, ensure_ascii=False))
