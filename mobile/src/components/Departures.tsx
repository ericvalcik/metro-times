import { FC, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import MetroIcon from '@/assets/icons/metro.svg';
import { fetchStops } from '@/api/fetchStops';
import { useAppContext } from '@/components/AppContext';
import { typeToColor } from '@/components/Tag';
import { allStops, Stop } from '@/data/stops';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useGeolocation } from '@/hooks/use-geolocation';
import { calcDistance, parseDeparture, parseMiliseconds } from '@/lib/utils';
import { Departure as DepartureType } from '@/types';

const uniqByHeadsign = (departures: DepartureType[]): DepartureType[] => {
  const seen = new Set<string>();
  const out: DepartureType[] = [];
  for (const d of departures) {
    const key = d.trip.headsign;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
};

export const Departures: FC = () => {
  const { stops, setStops } = useAppContext();
  const coords = useGeolocation();

  const queryKey = stops.reduce<string[]>(
    (acc, stop) => acc.concat(stop.stops),
    [],
  );
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['stops', queryKey],
    queryFn: fetchStops,
    refetchInterval: 2000,
    enabled: queryKey.length > 0,
  });

  useEffect(() => {
    if (!coords) return;
    const nextStops = allStops
      .map((stop) => {
        const distance = calcDistance(coords, [stop.lat, stop.lon]);
        return { distance, ...stop };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    setStops([...nextStops]);
  }, [coords, setStops]);

  if (!coords) {
    return <Text style={styles.status}>Getting location...</Text>;
  }

  if (stops.length === 0) {
    return null;
  }

  if (isPending) {
    return <Text style={styles.status}>Loading...</Text>;
  }

  if (isError) {
    return <Text style={styles.status}>Error: {error.message}</Text>;
  }

  if (!data) {
    return null;
  }

  return (
    <View style={styles.root}>
      <View style={styles.list}>
        {stops.map((stop) => (
          <StopDepartureGroup
            allDepartures={data[0]}
            stop={stop}
            key={stop.name}
          />
        ))}
      </View>
    </View>
  );
};

const StopDepartureGroup: FC<{
  allDepartures: DepartureType[];
  stop: Stop;
}> = ({ allDepartures, stop }) => {
  const stopDepartures = uniqByHeadsign(
    allDepartures.filter((departure) =>
      stop.stops.includes(departure.stop?.id),
    ),
  );

  if (stopDepartures.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MetroIcon width={21} height={22} fill={typeToColor[stop.type]} />
        <Text style={styles.stopName}>{stop.name}</Text>
      </View>
      {stopDepartures.map((departure, index) => (
        <Departure key={index} departure={departure} />
      ))}
    </View>
  );
};

const Departure: FC<{ departure: DepartureType }> = ({ departure }) => {
  const currentTime = useCurrentTime();
  const { predicted, direction } = parseDeparture(departure);
  const diff = predicted.getTime() - currentTime.getTime();
  const secondsLeft = Math.round(diff / 1000);

  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{direction}</Text>
      <Text style={styles.rowText}>
        {secondsLeft < 0 ? 'Departing' : parseMiliseconds(diff)}
      </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowText: {
    color: '#FFFFFF',
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
