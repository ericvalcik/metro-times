import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type Coords = [number, number];

const MYSLBACH_FALLBACK: Coords = [50.07777384729586, 14.417414782736316];

export const useGeolocation = (): Coords | null => {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (__DEV__) {
            console.log(
              'Location permission denied; falling back to Myslbach defaults (dev only).',
            );
            if (!cancelled) setCoords(MYSLBACH_FALLBACK);
          } else {
            console.error('Location permission denied.');
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setCoords([position.coords.latitude, position.coords.longitude]);
        }
      } catch (error) {
        console.error(error);
        if (__DEV__ && !cancelled) {
          console.log(
            'getCurrentPositionAsync threw; falling back to Myslbach defaults (dev only).',
          );
          setCoords(MYSLBACH_FALLBACK);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
};
