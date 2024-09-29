import { useEffect, useState } from "react";

export type Coords = [number, number];

export const useGeolocation = () => {
  const [coords, setCoords] = useState<Coords | null>(null);

  const onSuccess = (position: GeolocationPosition) => {
    setCoords([position.coords.latitude, position.coords.longitude]);
  };

  const onError = (error: GeolocationPositionError) => {
    console.error(error);

    if (process.env.NODE_ENV === "development") {
      console.log(
        "But falling back to myslbach defaults as we are in development mode.",
      );
      setCoords([50.07777384729586, 14.417414782736316]);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      console.log(
        "Geolocation is supported by this browser. Getting location...",
      );
      navigator.geolocation.getCurrentPosition(onSuccess, onError);
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  return coords;
};
