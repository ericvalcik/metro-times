# playground

Python sandbox for poking at APIs (mostly Golemio) and trying ideas. Not shipped, not tested, throw-away code is fine.

## Setup

Managed by [`uv`](https://docs.astral.sh/uv/). Install it once:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then, from this directory:

```bash
cd playground
cp .env.example .env.local   # paste your Golemio token
uv sync                      # creates .venv and installs deps from uv.lock
uv run main.py               # runs the Golemio departures example
```

`uv` auto-creates `.venv/` on the first `uv run` / `uv sync` — no manual `python -m venv` needed. The pinned Python version lives in `.python-version` (currently 3.13).

## Day-to-day

```bash
uv run main.py               # run a script
uv run python                # interactive REPL
uv add <pkg>                 # add a dependency (writes to pyproject.toml + uv.lock)
uv remove <pkg>              # drop a dependency
uv lock --upgrade            # upgrade locked versions
```

If you want a nicer REPL: `uv add --dev ipython` then `uv run ipython`.

## Layout

```
playground/
├── .env.example      # GOLEMIO_API_KEY placeholder
├── .env.local        # real key (gitignored)
├── .gitignore        # .venv, __pycache__, etc.
├── .python-version   # 3.13
├── main.py           # Golemio departures example (Bořislavka, line A)
├── pyproject.toml    # deps + project metadata
└── uv.lock           # pinned versions — commit this
```

## Environment

`GOLEMIO_API_KEY` in `.env.local` — same token as `mobile/.env.local`'s `EXPO_PUBLIC_API_KEY`. Loaded via `python-dotenv` in `main.py`. The root `.gitignore` excludes `.env*.local`, so the file is safe to keep locally.

## API reference

`main.py` mirrors the request shape used by `mobile/src/api/fetchStops.ts`: a GET against `https://api.golemio.cz/v2/public/departureboards` with `stopIds` URL-encoded as `{"0": [<platform-id>, ...]}` and the `X-Access-Token` header. Platform IDs live in `mobile/src/data/stops.ts`.

Golemio Public Transport API — full surface used (and not yet used) by this project:

- Swagger UI: <https://api.golemio.cz/pid/docs/openapi/>
- Raw OpenAPI 3.0.3 spec (JSON, ~165 KB): <https://api.golemio.cz/docs/static/vp-output-gateway/openapi.json>

The Swagger page is JS-rendered, so to grep/diff the spec from a script, fetch the raw JSON URL directly. Covers FYPR, MVT vector tiles, GTFS static (`/v2/gtfs/*`), GTFS realtime + vehicle positions, and PID departure boards v2–v4.
