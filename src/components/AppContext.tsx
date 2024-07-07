"use client";

import { FC, createContext, useContext, useState, ReactNode } from "react";

export type AppContextType = {
  stops: string[];
  setStops: (stops: string[]) => void;
};

const defaultAppContext: AppContextType = {
  stops: [],
  setStops: () => {},
};

export const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = (): AppContextType => {
  return useContext(AppContext);
};

export const AppContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [stops, setStops] = useState<string[]>([]);

  return (
    <AppContext.Provider value={{ stops, setStops }}>
      {children}
    </AppContext.Provider>
  );
};
