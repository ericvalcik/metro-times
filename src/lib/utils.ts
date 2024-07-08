import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Departure } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDeparture(departure: Departure) {
  return {
    predicted: new Date(departure.departure.timestamp_predicted),
    direction: departure.trip.headsign,
  };
}
