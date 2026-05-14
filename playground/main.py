import json
import os
from urllib.parse import quote

import httpx
from dotenv import load_dotenv
from rich import print

load_dotenv(".env.local")

API_KEY = os.environ["GOLEMIO_API_KEY"]

# Bořislavka, line A — both platform directions.
STOP_IDS = ["U157Z101P", "U157Z102P"]


def fetch_departures(stop_ids: list[str], limit: int = 10, minutes_after: int = 360) -> dict:
    encoded = quote(json.dumps({"0": stop_ids}))
    url = (
        "https://api.golemio.cz/v2/public/departureboards"
        f"?stopIds={encoded}&limit={limit}&minutesAfter={minutes_after}"
    )
    r = httpx.get(url, headers={"Accept": "application/json", "X-Access-Token": API_KEY})
    r.raise_for_status()
    return r.json()


if __name__ == "__main__":
    data = fetch_departures(STOP_IDS)
    print(data)
