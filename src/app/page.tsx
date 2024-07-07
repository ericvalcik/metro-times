"use client";

import { ComboBoxResponsive } from "@/components/ui/combobox";
import { AppContextProvider } from "@/components/AppContext";

export default function Home() {
  return (
    <AppContextProvider>
      <main className="px-4">
        <div className="max-w-[358px] mx-auto flex min-h-screen w-full flex-col items-start justify-between pt-12">
          <ComboBoxResponsive />
        </div>
      </main>
    </AppContextProvider>
  );
}
