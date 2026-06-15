import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  createElement,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { allStops, CompactStop, isMetroType } from '@/data/stops';

const STORAGE_KEY = 'selectedStops';

/** Per-group selection. `all` short-circuits the explicit platform list. */
type GroupSelection = { all: boolean; platforms: string[] };
type Selection = Record<string, GroupSelection>;

export type GroupSelectionState = 'all' | 'some' | 'none';

type SelectedStopsContextValue = {
  /** True once the persisted selection has been read from storage. */
  hydrated: boolean;
  /** Resolved stop groups (with `stops` filtered to selected platforms), name-sorted. */
  selectedStops: CompactStop[];
  toggleGroup: (groupId: string) => void;
  togglePlatform: (groupId: string, platformId: string) => void;
  isGroupSelected: (groupId: string) => GroupSelectionState;
  isPlatformSelected: (groupId: string, platformId: string) => boolean;
};

const groupById = new Map<string, CompactStop>(allStops.map((g) => [g.id, g]));

/** First-launch default: select only the metro platforms of metro stations. */
const buildDefaultSelection = (): Selection => {
  const selection: Selection = {};
  for (const group of allStops) {
    if (!isMetroType(group.mainTrafficType)) continue;
    const metroPlatforms = group.stops.filter((p) => isMetroType(p.type));
    if (metroPlatforms.length === 0) continue;
    selection[group.id] =
      metroPlatforms.length === group.stops.length
        ? { all: true, platforms: [] }
        : { all: false, platforms: metroPlatforms.map((p) => p.id) };
  }
  return selection;
};

/** Resolve a group's selected platform ids, dropping any that no longer exist. */
const resolvePlatformIds = (group: CompactStop, sel: GroupSelection): string[] => {
  if (sel.all) return group.stops.map((p) => p.id);
  const valid = new Set(group.stops.map((p) => p.id));
  return sel.platforms.filter((id) => valid.has(id));
};

const SelectedStopsContext = createContext<SelectedStopsContextValue | null>(null);

export const SelectedStopsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<Selection>({});
  const [hydrated, setHydrated] = useState(false);
  // Skip the persistence write triggered by the initial hydrate.
  const skipNextPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const next = raw ? (JSON.parse(raw) as Selection) : buildDefaultSelection();
        if (!cancelled) setSelection(next);
      } catch {
        if (!cancelled) setSelection(buildDefaultSelection());
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection)).catch(() => {});
  }, [selection, hydrated]);

  const selectedStops = useMemo<CompactStop[]>(() => {
    const out: CompactStop[] = [];
    // allStops is already name-sorted, so iterating it keeps a stable order.
    for (const group of allStops) {
      const sel = selection[group.id];
      if (!sel) continue;
      const ids = new Set(resolvePlatformIds(group, sel));
      if (ids.size === 0) continue;
      out.push({ ...group, stops: group.stops.filter((p) => ids.has(p.id)) });
    }
    return out;
  }, [selection]);

  const isGroupSelected = useCallback(
    (groupId: string): GroupSelectionState => {
      const group = groupById.get(groupId);
      const sel = selection[groupId];
      if (!group || !sel) return 'none';
      const count = resolvePlatformIds(group, sel).length;
      if (count === 0) return 'none';
      return count === group.stops.length ? 'all' : 'some';
    },
    [selection],
  );

  const isPlatformSelected = useCallback(
    (groupId: string, platformId: string): boolean => {
      const sel = selection[groupId];
      if (!sel) return false;
      return sel.all || sel.platforms.includes(platformId);
    },
    [selection],
  );

  const toggleGroup = useCallback((groupId: string) => {
    setSelection((prev) => {
      const group = groupById.get(groupId);
      if (!group) return prev;
      const current = prev[groupId];
      const allSelected =
        current && resolvePlatformIds(group, current).length === group.stops.length;
      const next = { ...prev };
      if (allSelected) {
        delete next[groupId];
      } else {
        next[groupId] = { all: true, platforms: [] };
      }
      return next;
    });
  }, []);

  const togglePlatform = useCallback((groupId: string, platformId: string) => {
    setSelection((prev) => {
      const group = groupById.get(groupId);
      if (!group) return prev;
      const current = prev[groupId];
      const ids = new Set(current ? resolvePlatformIds(group, current) : []);
      if (ids.has(platformId)) ids.delete(platformId);
      else ids.add(platformId);

      const next = { ...prev };
      if (ids.size === 0) {
        delete next[groupId];
      } else if (ids.size === group.stops.length) {
        next[groupId] = { all: true, platforms: [] };
      } else {
        next[groupId] = { all: false, platforms: [...ids] };
      }
      return next;
    });
  }, []);

  const value: SelectedStopsContextValue = {
    hydrated,
    selectedStops,
    toggleGroup,
    togglePlatform,
    isGroupSelected,
    isPlatformSelected,
  };

  return createElement(SelectedStopsContext.Provider, { value }, children);
};

export const useSelectedStops = (): SelectedStopsContextValue => {
  const ctx = useContext(SelectedStopsContext);
  if (!ctx) {
    throw new Error('useSelectedStops must be used within a SelectedStopsProvider');
  }
  return ctx;
};
