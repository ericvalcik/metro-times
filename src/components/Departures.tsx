import uniqBy from "lodash.uniqby";
import { FC } from "react";
import { useAppContext } from "@/components/AppContext";
import { useQuery } from "@tanstack/react-query";
import { fetchStops } from "@/api/fetchStops";
import { Departure } from "@/types";
import { parseDeparture } from "@/lib/utils";
import { useCurrentTime } from "@/hooks/use-current-time";

export const Departures: FC = () => {
  const { stops } = useAppContext();
  const currentTime = useCurrentTime();
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["stops", stops],
    queryFn: fetchStops,
    refetchInterval: 2000,
  });

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
      <div className="flex flex-col gap-2">
        {uniqBy(data[0] as Departure[], (x) => x.trip.headsign).map(
          (departure: Departure) => {
            const { predicted, direction } = parseDeparture(departure);
            const secondsLeft = Math.round(
              (predicted.getTime() - currentTime.getTime()) / 1000,
            );

            return (
              <div key={departure.trip.id}>
                <div className="font-bold">{direction}</div>
                <div className="flex flex-row gap-2 justify-between">
                  <div>{predicted.toLocaleTimeString()}</div>
                  <div>
                    {secondsLeft < 0
                      ? "Departed"
                      : `in ~${Math.round(
                          (predicted.getTime() - currentTime.getTime()) / 1000,
                        )} seconds`}
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};
