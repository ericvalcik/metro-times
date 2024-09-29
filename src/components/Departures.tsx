import { FC, useEffect } from "react";
import { useAppContext } from "@/components/AppContext";
import { useQuery } from "@tanstack/react-query";
import { fetchStops } from "@/api/fetchStops";
import { Departure as DepartureType } from "@/types";
import {
  calcDistance,
  parseDeparture,
  parseDistance,
  parseMiliseconds,
} from "@/lib/utils";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useGeolocation } from "@/hooks/use-geolocation";
import { allStops, Stop } from "@/data/stops";
import { TypographyH3 } from "@/components/ui/typography";
import { MetroTag } from "@/components/Tag";

export const Departures: FC = () => {
  const { stops, setStops } = useAppContext();
  const coords = useGeolocation();

  const queryKey = stops.reduce<string[]>(
    (acc, stop) => acc.concat(stop.stops),
    [],
  );
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["stops", queryKey],
    queryFn: fetchStops,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!coords) return;
    const stops = allStops
      .map((stop) => {
        const distance = calcDistance(coords, [stop.lat, stop.lon]);
        return { distance, ...stop };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    setStops(stops);
  }, [coords, setStops]);

  if (!coords) {
    return <div>Getting location...</div>;
  }

  if (stops.length === 0) {
    return null;
  }

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {stops.map((stop) => (
          <StopDepartureGroup
            allDepartures={data[0]}
            stop={stop}
            key={stop.name}
          />
        ))}
      </div>
    </div>
  );
};

const StopDepartureGroup: FC<{
  allDepartures: DepartureType[];
  stop: Stop;
}> = ({ allDepartures, stop }) => {
  const stopDepartures = allDepartures.filter((departure) =>
    stop.stops.includes(departure.stop?.id),
  );

  if (stopDepartures.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-solid border-slate-700 py-2 pb-4 px-6 flex flex-col gap-2">
      <MetroTag type={stop.type} className="relative top-1.5 -left-4" />
      <div className="flex flex-row justify-between items-center pb-4">
        <TypographyH3>{stop.name}</TypographyH3>
        {stop?.distance ? <p>{parseDistance(stop.distance)}</p> : null}
      </div>
      {stopDepartures.map((departure, index) => (
        <Departure key={index} departure={departure} />
      ))}
    </div>
  );
};

const Departure: FC<{ departure: DepartureType }> = ({ departure }) => {
  const currentTime = useCurrentTime();
  const { predicted, direction } = parseDeparture(departure);
  const secondsLeft = Math.round(
    (predicted.getTime() - currentTime.getTime()) / 1000,
  );

  return (
    <div key={departure.trip.id}>
      <div className="flex flex-row gap-2 justify-between">
        <div className="font-semibold">{direction}</div>
        <div>
          {secondsLeft < 0
            ? "Departed"
            : `in ~${parseMiliseconds(predicted.getTime() - currentTime.getTime())}`}
        </div>
      </div>
    </div>
  );
};
