"""Analyze and visualize the PID stops.json dataset.

Downloads from https://data.pid.cz/stops/json/stops.json if stops.json is
missing, then renders summaries with rich.

Usage:
    uv run analyze_stops.py            # use existing stops.json
    uv run analyze_stops.py --refresh  # re-download first
"""

from __future__ import annotations

import json
import sys
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

STOPS_URL = "https://data.pid.cz/stops/json/stops.json"
STOPS_PATH = Path(__file__).with_name("stops.json")

console = Console()


# --- loading -----------------------------------------------------------------


def download(target: Path) -> None:
    console.print(f"Downloading [cyan]{STOPS_URL}[/]…")
    with urllib.request.urlopen(STOPS_URL) as resp, target.open("wb") as f:
        f.write(resp.read())
    size_mb = target.stat().st_size / 1_048_576
    console.print(f"Saved [green]{target.name}[/] ({size_mb:.1f} MB)")


def load() -> dict:
    refresh = "--refresh" in sys.argv
    if refresh or not STOPS_PATH.exists():
        download(STOPS_PATH)
    with STOPS_PATH.open() as f:
        return json.load(f)


# --- visualizations ----------------------------------------------------------


def render_overview(data: dict, groups: list[dict]) -> None:
    n_groups = len(groups)
    n_platforms = sum(len(sg["stops"]) for sg in groups)
    n_gtfs = sum(len(st.get("gtfsIds", [])) for sg in groups for st in sg["stops"])
    n_lines = len(
        {
            (line.get("id"), line.get("name"), line.get("type"))
            for sg in groups
            for st in sg["stops"]
            for line in st.get("lines", [])
        }
    )
    body = (
        f"[bold]Generated at[/]  {data.get('generatedAt')}\n"
        f"[bold]Format version[/] {data.get('dataFormatVersion')}\n\n"
        f"[bold cyan]{n_groups:>7,}[/] stop groups\n"
        f"[bold cyan]{n_platforms:>7,}[/] platforms\n"
        f"[bold cyan]{n_gtfs:>7,}[/] GTFS IDs\n"
        f"[bold cyan]{n_lines:>7,}[/] unique lines"
    )
    console.print(Panel(body, title="PID stops.json", border_style="blue"))


def bar(value: int, total: int, width: int = 30) -> str:
    if total == 0:
        return ""
    filled = round(width * value / total)
    return "█" * filled + "·" * (width - filled)


def render_distribution(
    title: str, counter: Counter, *, top: int | None = None, color: str = "magenta"
) -> None:
    items = counter.most_common(top)
    total = sum(counter.values())
    table = Table(title=title, title_style=f"bold {color}", show_lines=False, expand=False)
    table.add_column("key", style="bold")
    table.add_column("count", justify="right", style="cyan")
    table.add_column("share", justify="right", style="dim")
    table.add_column("bar")
    for key, n in items:
        pct = n / total * 100 if total else 0
        table.add_row(str(key), f"{n:,}", f"{pct:5.1f}%", f"[{color}]{bar(n, max(c for _, c in items))}[/]")
    if top is not None and len(counter) > top:
        rest = total - sum(n for _, n in items)
        table.add_row("…(rest)", f"{rest:,}", f"{rest / total * 100:5.1f}%", "")
    console.print(table)


def survey(groups: list[dict]) -> dict[str, Counter]:
    traffic = Counter()
    wheelchair = Counter()
    zones = Counter()
    districts = Counter()
    line_type = Counter()
    municipalities = Counter()
    is_night = Counter()
    platform_size = Counter()

    for sg in groups:
        traffic[sg.get("mainTrafficType", "?")] += 1
        districts[sg.get("districtCode", "?")] += 1
        municipalities[sg.get("municipality", "?")] += 1
        platform_size[len(sg["stops"])] += 1
        for st in sg["stops"]:
            wheelchair[st.get("wheelchairAccess", "?")] += 1
            zones[st.get("zone", "?")] += 1
            for line in st.get("lines", []):
                line_type[line.get("type", "?")] += 1
                is_night["night" if line.get("isNight") else "day"] += 1

    return {
        "traffic": traffic,
        "wheelchair": wheelchair,
        "zones": zones,
        "districts": districts,
        "line_type": line_type,
        "municipalities": municipalities,
        "is_night": is_night,
        "platform_size": platform_size,
    }


def render_schema(groups: list[dict]) -> None:
    sg_keys: set[str] = set()
    stop_keys: set[str] = set()
    line_keys: set[str] = set()
    for sg in groups:
        sg_keys.update(sg.keys())
        for st in sg["stops"]:
            stop_keys.update(st.keys())
            for line in st.get("lines", []):
                line_keys.update(line.keys())
    table = Table(title="Schema", title_style="bold yellow")
    table.add_column("level", style="bold")
    table.add_column("keys")
    table.add_row("stopGroup", ", ".join(sorted(sg_keys)))
    table.add_row("stop", ", ".join(sorted(stop_keys)))
    table.add_row("line", ", ".join(sorted(line_keys)))
    console.print(table)


def render_metro(groups: list[dict]) -> None:
    metro_groups = [sg for sg in groups if sg.get("mainTrafficType", "").startswith("metro")]
    lines_by_name: dict[str, set[str]] = defaultdict(set)
    for sg in groups:
        for st in sg["stops"]:
            for line in st.get("lines", []):
                if line.get("type") == "metro":
                    if line.get("direction"):
                        lines_by_name[line["name"]].add(line["direction"])
                    if line.get("direction2"):
                        lines_by_name[line["name"]].add(line["direction2"])

    console.print(Rule("[bold cyan]Metro"))
    console.print(f"[bold]{len(metro_groups)}[/] metro stop groups")
    line_table = Table(title="Metro lines", title_style="bold cyan")
    line_table.add_column("line", style="bold")
    line_table.add_column("terminals")
    for name in sorted(lines_by_name):
        line_table.add_row(name, " ↔ ".join(sorted(lines_by_name[name])))
    console.print(line_table)

    # Group metro stations by which line(s) they serve
    by_type: dict[str, list[str]] = defaultdict(list)
    for sg in metro_groups:
        by_type[sg["mainTrafficType"]].append(sg["fullName"])
    type_table = Table(title="Metro stations by line membership", title_style="bold cyan")
    type_table.add_column("mainTrafficType", style="bold")
    type_table.add_column("n", justify="right")
    type_table.add_column("stations")
    for t in sorted(by_type):
        names = sorted(by_type[t])
        type_table.add_row(t, str(len(names)), ", ".join(names))
    console.print(type_table)


def render_biggest(groups: list[dict]) -> None:
    biggest = sorted(groups, key=lambda sg: -len(sg["stops"]))[:10]
    table = Table(title="Largest stop groups (by platform count)", title_style="bold green")
    table.add_column("name", style="bold")
    table.add_column("type")
    table.add_column("platforms", justify="right")
    table.add_column("lat", justify="right")
    table.add_column("lon", justify="right")
    for sg in biggest:
        table.add_row(
            sg["fullName"],
            sg.get("mainTrafficType", "?"),
            str(len(sg["stops"])),
            f"{sg['avgLat']:.5f}",
            f"{sg['avgLon']:.5f}",
        )
    console.print(table)


def render_geo_bounds(groups: list[dict]) -> None:
    lats = [sg["avgLat"] for sg in groups if sg.get("avgLat")]
    lons = [sg["avgLon"] for sg in groups if sg.get("avgLon")]
    if not lats:
        return
    body = (
        f"latitude  [cyan]{min(lats):.5f}[/] → [cyan]{max(lats):.5f}[/]\n"
        f"longitude [cyan]{min(lons):.5f}[/] → [cyan]{max(lons):.5f}[/]"
    )
    console.print(Panel(body, title="Geographic bounds", border_style="green"))


def render_ascii_map(groups: list[dict], *, w: int = 80, h: int = 24) -> None:
    """Tiny ASCII heat-map of stop density across the bounding box."""
    cells: list[list[int]] = [[0] * w for _ in range(h)]
    lats = [sg["avgLat"] for sg in groups if sg.get("avgLat")]
    lons = [sg["avgLon"] for sg in groups if sg.get("avgLon")]
    lat_min, lat_max = min(lats), max(lats)
    lon_min, lon_max = min(lons), max(lons)
    for sg in groups:
        lat, lon = sg.get("avgLat"), sg.get("avgLon")
        if lat is None or lon is None:
            continue
        # invert y because lat grows north
        x = int((lon - lon_min) / (lon_max - lon_min) * (w - 1))
        y = int((lat_max - lat) / (lat_max - lat_min) * (h - 1))
        cells[y][x] += 1

    peak = max(max(row) for row in cells)
    ramp = " ·:-=+*#%@"
    lines = []
    for row in cells:
        line = "".join(ramp[min(len(ramp) - 1, int(v / peak * (len(ramp) - 1)))] for v in row)
        lines.append(line)
    console.print(
        Panel(
            Text("\n".join(lines)),
            title=f"Stop density (peak={peak} stops/cell, {w}×{h})",
            border_style="green",
        )
    )


# --- main --------------------------------------------------------------------


def main() -> None:
    data = load()
    groups = data["stopGroups"]

    render_overview(data, groups)
    render_schema(groups)

    stats = survey(groups)
    console.print(Rule("[bold]Distributions"))
    render_distribution("mainTrafficType (stop groups)", stats["traffic"], color="magenta")
    render_distribution("Line type (per stop occurrence)", stats["line_type"], color="cyan")
    render_distribution("Wheelchair access (platforms)", stats["wheelchair"], color="yellow")
    render_distribution("Day vs night line occurrences", stats["is_night"], color="blue")
    render_distribution("Top zones", stats["zones"], top=12, color="green")
    render_distribution("Top districts", stats["districts"], top=12, color="green")
    render_distribution("Top municipalities", stats["municipalities"], top=10, color="green")
    render_distribution("Platforms per stop group", stats["platform_size"], top=10, color="magenta")

    render_metro(groups)
    render_biggest(groups)
    render_geo_bounds(groups)
    render_ascii_map(groups)


if __name__ == "__main__":
    main()
