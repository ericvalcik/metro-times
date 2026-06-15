import { FC, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import MetroIcon from '@/assets/icons/metro.svg';
import { fetchStops } from '@/api/fetchStops';
import { lineColor } from '@/components/Tag';
import { CompactStop, isMetroType } from '@/data/stops';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useSelectedStops } from '@/hooks/use-selected-stops';
import { calcDistance, parseDeparture, parseMiliseconds } from '@/lib/utils';
import { Departure as DepartureType } from '@/types';

const NEUTRAL_ICON_COLOR = '#9A9A9A';

type DepartureGroup = {
  first: DepartureType;
  second?: DepartureType;
};

/** Group departures by headsign (preserving order), keeping the next two per destination. */
const groupByHeadsign = (departures: DepartureType[]): DepartureGroup[] => {
  const order: string[] = [];
  const byHeadsign = new Map<string, DepartureType[]>();
  for (const d of departures) {
    const key = d.trip.headsign;
    if (!byHeadsign.has(key)) {
      byHeadsign.set(key, []);
      order.push(key);
    }
    byHeadsign.get(key)!.push(d);
  }
  return order.map((key) => {
    const list = byHeadsign.get(key)!;
    return { first: list[0], second: list[1] };
  });
};

/** Icon color for a stop card: its first metro line, else a neutral gray. */
const stopIconColor = (stop: CompactStop): string => {
  const metroPlatform = stop.stops.find((p) => isMetroType(p.type));
  return metroPlatform
    ? lineColor(metroPlatform.type, metroPlatform.lines[0])
    : NEUTRAL_ICON_COLOR;
};

export const Departures: FC = () => {
  const { selectedStops, hydrated } = useSelectedStops();
  const coords = useGeolocation();

  // The selected stops are the candidate pool; show the 5 closest to the user.
  const stops = useMemo<CompactStop[]>(() => {
    if (!coords) return [];
    return selectedStops
      .map((stop) => ({
        stop,
        distance: calcDistance(coords, [stop.avgLat, stop.avgLon]),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(({ stop }) => stop);
  }, [coords, selectedStops]);

  const queryKey = useMemo(
    () => stops.flatMap((stop) => stop.stops.map((p) => p.id)),
    [stops],
  );

  const { isPending, isError, data, error } = useQuery({
    queryKey: ['stops', queryKey],
    queryFn: fetchStops,
    refetchInterval: 2000,
    enabled: queryKey.length > 0,
  });

  if (!hydrated) {
    return <Text style={styles.status}>Loading...</Text>;
  }

  if (selectedStops.length === 0) {
    return (
      <Text style={styles.status}>
        No stops selected. Add some on the Stations tab.
      </Text>
    );
  }

  if (!coords) {
    return <Text style={styles.status}>Getting location...</Text>;
  }

  if (isPending) {
    return <Text style={styles.status}>Loading...</Text>;
  }

  if (isError) {
    return <Text style={styles.status}>Error: {error.message}</Text>;
  }

  // The API returns one departures array per requested group; bad requests
  // return an error object instead, so guard before reading data[0].
  const departures = Array.isArray(data?.[0]) ? data[0] : [];

  return (
    <View style={styles.root}>
      <View style={styles.list}>
        {stops.map((stop) => (
          <StopDepartureGroup allDepartures={departures} stop={stop} key={stop.id} />
        ))}
      </View>
    </View>
  );
};

const StopDepartureGroup: FC<{
  allDepartures: DepartureType[];
  stop: CompactStop;
}> = ({ allDepartures, stop }) => {
  const platformIds = new Set(stop.stops.map((p) => p.id));
  const stopDepartures = groupByHeadsign(
    allDepartures.filter((departure) => platformIds.has(departure.stop?.id)),
  );

  if (stopDepartures.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MetroIcon width={21} height={22} fill={stopIconColor(stop)} />
        <Text style={styles.stopName}>{stop.name}</Text>
      </View>
      {stopDepartures.map((group, index) => (
        <Departure key={index} group={group} />
      ))}
    </View>
  );
};

const Departure: FC<{ group: DepartureGroup }> = ({ group }) => {
  const currentTime = useCurrentTime();
  const { predicted, direction, name, type } = parseDeparture(group.first);
  const diff = predicted.getTime() - currentTime.getTime();
  const secondsLeft = Math.round(diff / 1000);

  const nextDiff = group.second
    ? new Date(group.second.departure.timestamp_predicted).getTime() -
      currentTime.getTime()
    : null;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={[styles.rowName, { color: lineColor(type, name) }]}>
          {name}
        </Text>
        <Text style={styles.rowDirection} numberOfLines={1}>
          {direction}
        </Text>
      </View>
      <View style={styles.rowTimers}>
        <Text style={styles.rowTimer}>
          {secondsLeft < 0 ? 'Departing' : parseMiliseconds(diff)}
        </Text>
        {nextDiff !== null && nextDiff > 0 && (
          <Text style={styles.rowTimerNext}>({parseMiliseconds(nextDiff)})</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  list: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    flexDirection: 'column',
    gap: 8,
    backgroundColor: '#131313',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 19,
  },
  stopName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'IBMPlexMono_600SemiBold',
  },
  row: {
    flexDirection: 'column',
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'IBMPlexMono_600SemiBold',
  },
  rowDirection: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'IBMPlexMono_400Regular',
    flexShrink: 1,
  },
  rowTimers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  rowTimer: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'IBMPlexMono_400Regular',
  },
  rowTimerNext: {
    color: '#9A9A9A',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'IBMPlexMono_400Regular',
  },
  status: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'IBMPlexMono_400Regular',
  },
});
