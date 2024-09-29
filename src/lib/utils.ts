import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Departure } from "@/types";
import { Coords } from "@/hooks/use-geolocation";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDeparture(departure: Departure) {
  return {
    predicted: new Date(departure.departure.timestamp_predicted),
    direction: departure.trip.headsign,
  };
}

export const distance = (coords1: Coords, coords2: Coords) => {
  if (coords1[0] == coords2[0] && coords1[1] == coords2[1]) {
    return 0;
  } else {
    var radlat1 = (Math.PI * coords1[0]) / 180;
    var radlat2 = (Math.PI * coords2[0]) / 180;
    var theta = coords1[1] - coords2[1];
    var radtheta = (Math.PI * theta) / 180;
    var dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1853.15962; // a constant for meters
    return dist;
  }
};
