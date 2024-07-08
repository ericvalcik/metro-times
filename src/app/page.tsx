"use client";

import { ComboBoxResponsive } from "@/components/ui/combobox";
import { AppContextProvider } from "@/components/AppContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Departures } from "@/components/Departures";
import { TypographyH1 } from "@/components/ui/typography";

// Create a client
const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <main className="px-4">
          <div className="max-w-[358px] mx-auto flex min-h-screen w-full flex-col items-start pt-12">
            <TypographyH1>Precise Metro Departures 🎯</TypographyH1>
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
