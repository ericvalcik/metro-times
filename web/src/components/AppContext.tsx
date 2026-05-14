"use client";

import { Stop } from "@/data/stops";
import {
  FC,
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

export type AppContextType = {
  stops: Stop[];
  setStops: (stops: Stop[]) => void;
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
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    console.log("CONTEXT UPDATED:", stops);
  }, [stops]);

  return (
    <AppContext.Provider value={{ stops, setStops }}>
      {children}
    </AppContext.Provider>
  );
};
