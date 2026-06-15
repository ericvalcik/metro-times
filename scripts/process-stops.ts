/**
 * One-off build script: playground/stops.json -> mobile/src/data/allStops.json
 *
 * Reads the full Golemio stop-group dump (~18 MB), keeps only Prague
 * (districtCode "AB") groups, and projects each one down to the handful of
 * fields the mobile app needs. The result is committed and bundled into the JS,
 * so it must stay small (well under 1 MB).
 *
 * Run from the repo root with Node 24+ (native TS type-stripping):
 *   node scripts/process-stops.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const INPUT = join(ROOT, 'playground', 'stops.json');
const OUTPUT = join(ROOT, 'mobile', 'src', 'data', 'allStops.json');

type RawLine = { name: string; type: string };
type RawPlatform = {
  platform: string;
  mainTrafficType: string;
  gtfsIds: string[];
  lines?: RawLine[];
};
type RawGroup = {
  districtCode: string;
  uniqueName: string;
  name: string;
  fullName: string;
  avgLat: number;
  avgLon: number;
  mainTrafficType: string;
  stops: RawPlatform[];
};

type CompactPlatform = {
  id: string; // chosen gtfsId (prefer the "...P" PID stop id)
  platform: string; // platform label, e.g. "M1", "A", "1"
  type: string; // platform mainTrafficType, e.g. "metroA" | "tram" | "bus"
  lines: string[]; // deduped, sorted line names, e.g. ["A"] or ["9", "22"]
};
type CompactStop = {
  id: string; // first platform id — stable & unique within Prague
  name: string; // uniqueName
  avgLat: number;
  avgLon: number;
  mainTrafficType: string;
  stops: CompactPlatform[];
};

/** Prefer the PID stop id ("...P"); fall back to the first gtfsId. */
const pickId = (gtfsIds: string[]): string | null => {
  if (!gtfsIds || gtfsIds.length === 0) return null;
  return gtfsIds.find((id) => id.endsWith('P')) ?? gtfsIds[0];
};

/** Display order for platforms within a group: metro first, then surface. */
const typeRank = (type: string): number => {
  if (type.startsWith('metro')) return 0;
  return { tram: 1, trolleybus: 2, bus: 3, train: 4, ferry: 5 }[type] ?? 6;
};

/** Sort numeric line names numerically, leave letters (metro A/B/C) lexical. */
const sortLines = (names: string[]): string[] =>
  [...names].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNum = !Number.isNaN(na);
    const bNum = !Number.isNaN(nb);
    if (aNum && bNum) return na - nb;
    if (aNum !== bNum) return aNum ? 1 : -1; // letters (metro) before numbers
    return a.localeCompare(b);
  });

const raw = JSON.parse(readFileSync(INPUT, 'utf8')) as { stopGroups: RawGroup[] };

const out: CompactStop[] = [];
const seenIds = new Set<string>();

for (const group of raw.stopGroups) {
  if (group.districtCode !== 'AB') continue;

  const platforms: CompactPlatform[] = [];
  for (const p of group.stops) {
    const lines = sortLines([...new Set((p.lines ?? []).map((l) => l.name))]);
    if (lines.length === 0) continue; // drop entrances / line-less platforms
    const id = pickId(p.gtfsIds);
    if (!id) continue;
    platforms.push({ id, platform: p.platform, type: p.mainTrafficType, lines });
  }

  if (platforms.length === 0) continue;

  platforms.sort((a, b) => {
    const r = typeRank(a.type) - typeRank(b.type);
    return r !== 0 ? r : a.platform.localeCompare(b.platform, undefined, { numeric: true });
  });

  const id = platforms[0].id;
  if (seenIds.has(id)) {
    throw new Error(`Duplicate group id ${id} for ${group.uniqueName}`);
  }
  seenIds.add(id);

  out.push({
    id,
    name: group.uniqueName,
    avgLat: group.avgLat,
    avgLon: group.avgLon,
    mainTrafficType: group.mainTrafficType,
    stops: platforms,
  });
}

out.sort((a, b) => a.name.localeCompare(b.name, 'cs'));

writeFileSync(OUTPUT, JSON.stringify(out));

const bytes = readFileSync(OUTPUT).length;
const metro = out.filter((g) => g.mainTrafficType.startsWith('metro')).length;
console.log(
  `Wrote ${out.length} stop groups (${metro} metro) to ${OUTPUT} — ${(bytes / 1024).toFixed(0)} KB`,
);
