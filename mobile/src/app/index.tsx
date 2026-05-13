import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MetroIcon from '@/assets/icons/metro.svg';
import { fetchStops } from '@/api/fetchStops';
import { allStops } from '@/data/stops';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useGeolocation } from '@/hooks/use-geolocation';
import { calcDistance, parseMiliseconds } from '@/lib/utils';

const MYSLBACH: [number, number] = [50.07777384729586, 14.417414782736316];

export default function TimesScreen() {
  const currentTime = useCurrentTime();
  const coords = useGeolocation();
  const [apiStatus, setApiStatus] = useState<string>('calling fetchStops…');
  const [firstDeparture, setFirstDeparture] = useState<string>('—');

  useEffect(() => {
    fetchStops({ queryKey: ['debug', ['U321Z101P']] } as any)
      .then((res) => {
        const list = res?.['0'] ?? {};
        const keys = Object.keys(list);
        setApiStatus(`fetchStops OK — ${keys.length} departures`);
        if (keys.length) {
          const d = list[keys[0]];
          setFirstDeparture(
            `${d.route.short_name} → ${d.trip.headsign} @ ${d.departure.timestamp_predicted}`,
          );
        } else {
          setFirstDeparture('(no departures in window)');
        }
      })
      .catch((err: unknown) => {
        setApiStatus(`fetchStops FAILED: ${String(err)}`);
      });
  }, []);

  const dejvicka = allStops.find((s) => s.name === 'Dejvická')!;
  const borislavka = allStops.find((s) => s.name === 'Bořislavka')!;
  const distanceMyslbachToBorislavka = calcDistance(MYSLBACH, [
    borislavka.lat,
    borislavka.lon,
  ]);
  const distanceMyslbachToDejvicka = calcDistance(MYSLBACH, [
    dejvicka.lat,
    dejvicka.lon,
  ]);

  const apiKeyLoaded = Boolean(process.env.EXPO_PUBLIC_API_KEY);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Phase 2 debug</Text>

        <View style={styles.icons}>
          <MetroIcon width={21} height={22} fill="#50AF32" />
          <MetroIcon width={21} height={22} fill="#FFD500" />
          <MetroIcon width={21} height={22} fill="#E63024" />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>EXPO_PUBLIC_API_KEY loaded</Text>
          <Text style={styles.value}>{apiKeyLoaded ? 'yes' : 'NO'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>useCurrentTime tick</Text>
          <Text style={styles.value}>{currentTime.toLocaleTimeString()}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>parseMiliseconds(125000)</Text>
          <Text style={styles.value}>{parseMiliseconds(125000)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>calcDistance Myslbach→Bořislavka</Text>
          <Text style={styles.value}>
            {distanceMyslbachToBorislavka.toFixed(0)} m
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>calcDistance Myslbach→Dejvická</Text>
          <Text style={styles.value}>
            {distanceMyslbachToDejvicka.toFixed(0)} m
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>fetchStops(U321Z101P)</Text>
          <Text style={styles.value}>{apiStatus}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>first departure</Text>
          <Text style={styles.value}>{firstDeparture}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>useGeolocation</Text>
          <Text style={styles.value}>
            {coords
              ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
              : 'awaiting permission / fix…'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  icons: {
    flexDirection: 'row',
    gap: 16,
  },
  row: {
    gap: 4,
  },
  label: {
    color: '#888888',
    fontSize: 12,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
