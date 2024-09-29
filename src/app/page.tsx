"use client";

import { useState, useEffect } from "react";

import { ComboBoxResponsive } from "@/components/ui/combobox";
import { AppContextProvider } from "@/components/AppContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Departures } from "@/components/Departures";
import { TypographyH1 } from "@/components/ui/typography";

// Create a client
const queryClient = new QueryClient();

type Coords = [number, number];

export default function Home() {
  const [coords, setCoords] = useState<Coords | null>(null);

  const onSuccess = (position: GeolocationPosition) => {
    setCoords([position.coords.latitude, position.coords.longitude]);
  };

  const onError = (error: GeolocationPositionError) => {
    console.error(error);
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

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <main className="px-4">
          <div className="max-w-[358px] mx-auto flex min-h-screen w-full flex-col items-start pt-12">
            <TypographyH1>Precise Metro Departures 🎯</TypographyH1>
            <pre>{JSON.stringify(coords, null, 2)}</pre>
            <div className="pb-4">
              <ComboBoxResponsive />
            </div>
            <Departures />
          </div>
        </main>
      </AppContextProvider>
    </QueryClientProvider>
  );
}
