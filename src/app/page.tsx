"use client";

import { useEffect } from "react";

import { AppContextProvider, useAppContext } from "@/components/AppContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Departures } from "@/components/Departures";
import { TypographyH1 } from "@/components/ui/typography";
import { useGeolocation } from "@/hooks/use-geolocation";
import { allStops } from "@/data/stops";
import { calcDistance } from "@/lib/utils";

// Create a client
const queryClient = new QueryClient();

export default function Home() {
  const coords = useGeolocation();

  const distances = coords
    ? allStops
        .map((stop) => {
          const distance = calcDistance(coords, [stop.lat, stop.lon]);
          return { distance, name: stop.name, stops: stop.stops };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    : [{ error: "no coords" }];

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <main className="px-4 pb-6">
          <div className="max-w-[338px] mx-auto flex min-h-screen w-full flex-col items-start pt-12">
            {/* <TypographyH1>Departures</TypographyH1> */}
            {/* <pre className="py-4">{JSON.stringify(coords, null, 2)}</pre> */}
            {/* <pre className="py-4">{JSON.stringify(distances, null, 2)}</pre> */}
            {/* <div className="pb-4">
              <ComboBoxResponsive />
            </div> */}
            <Departures />
          </div>
        </main>
      </AppContextProvider>
    </QueryClientProvider>
  );
}
