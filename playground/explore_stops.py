"""Explore the GTFS /stops endpoint structure.

Usage: uv run explore_stops.py
"""

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


def fetch(params: dict | None = None) -> dict | list:
    r = httpx.get(
        URL,
        params=params or {},
        headers={"Accept": "application/json", "X-Access-Token": API_KEY},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def describe(value, depth: int = 0, max_depth: int = 4) -> str:
    pad = "  " * depth
    if depth > max_depth:
        return f"{type(value).__name__}(...)"
    if isinstance(value, dict):
        lines = [f"dict ({len(value)} keys)"]
        for k, v in value.items():
            lines.append(f"{pad}  {k!r}: {describe(v, depth + 1, max_depth)}")
        return "\n".join(lines)
    if isinstance(value, list):
        if not value:
            return "list (empty)"
        return f"list[{len(value)}] of {describe(value[0], depth + 1, max_depth)}"
    if value is None:
        return "None"
    return f"{type(value).__name__}={value!r}"


if __name__ == "__main__":
    # 1. Default page (no params)
    print(Rule("[bold]1. Default request (no params)"))
    data = fetch()
    print(f"Top-level type: {type(data).__name__}")
    if isinstance(data, dict):
        print(f"Top-level keys: {list(data.keys())}")
        # GeoJSON FeatureCollection?
        if data.get("type") == "FeatureCollection":
            features = data.get("features", [])
            print(f"FeatureCollection with {len(features)} features")
            if features:
                print(Rule("First feature shape"))
                print(describe(features[0]))
                print(Rule("First feature (raw, pretty)"))
                print(json.dumps(features[0], indent=2, ensure_ascii=False))
        else:
            print(describe(data, max_depth=3))
    elif isinstance(data, list):
        print(f"Got list of {len(data)} items")
        if data:
            print(Rule("First item shape"))
            print(describe(data[0]))
            print(Rule("First item (raw, pretty)"))
            print(json.dumps(data[0], indent=2, ensure_ascii=False))

    # 2. Try a larger limit + offset to see pagination behavior
    print(Rule("[bold]2. With limit=5"))
    small = fetch({"limit": 5})
    if isinstance(small, dict) and "features" in small:
        feats = small["features"]
    elif isinstance(small, list):
        feats = small
    else:
        feats = []
    print(f"Returned {len(feats)} features when limit=5")

    # 3. Filter by name (Bořislavka) — see if it's supported
    print(Rule("[bold]3. names=Bořislavka filter test"))
    try:
        named = fetch({"names": "Bořislavka"})
        if isinstance(named, dict) and "features" in named:
            nf = named["features"]
        elif isinstance(named, list):
            nf = named
        else:
            nf = []
        print(f"Returned {len(nf)} features for names=Bořislavka")
        if nf:
            print(json.dumps(nf[0], indent=2, ensure_ascii=False))
    except httpx.HTTPStatusError as e:
        print(f"names filter failed: {e.response.status_code} {e.response.text[:200]}")

    # 4. Survey property keys + location_type / wheelchair_boarding distributions
    print(Rule("[bold]4. Survey across all features"))
    if isinstance(data, dict) and "features" in data:
        features = data["features"]
        prop_keys = Counter()
        loc_types = Counter()
        wheelchair = Counter()
        zones = Counter()
        parent_stations = 0
        for f in features:
            props = f.get("properties", {}) or {}
            for k in props:
                prop_keys[k] += 1
            loc_types[props.get("location_type")] += 1
            wheelchair[props.get("wheelchair_boarding")] += 1
            zones[props.get("zone_id")] += 1
            if props.get("parent_station"):
                parent_stations += 1
        print(f"Total features: {len(features)}")
        print(f"Property keys (count of features that have them):")
        for k, c in prop_keys.most_common():
            print(f"  {k}: {c}")
        print(f"location_type distribution: {dict(loc_types)}")
        print(f"wheelchair_boarding distribution: {dict(wheelchair)}")
        print(f"features with parent_station set: {parent_stations}")
        print(f"zone_id distribution (top 15): {dict(zones.most_common(15))}")

        # Find a metro stop to show as example
        print(Rule("Example: first stop whose name contains 'Můstek' or 'Bořislavka'"))
        for f in features:
            name = (f.get("properties") or {}).get("stop_name") or ""
            if "Bořislavka" in name or "Můstek" in name:
                print(json.dumps(f, indent=2, ensure_ascii=False))
                break
