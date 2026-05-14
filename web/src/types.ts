export type Departure = {
  departure: {
    delay_seconds: number;
    minutes: number;
    timestamp_predicted: string;
    timestamp_scheduled: string;
  };
  route: {
    type: string;
    short_name: string;
  };
  stop: {
    id: string;
    platform_code: string;
    sequence: number;
  };
  trip: {
    headsign: string;
    id: string;
    is_cancelled: boolean;
  };
  vehicle: {
    has_charger: boolean | null;
    id: string;
    is_air_conditioned: boolean | null;
    is_wheelchair_accessible: boolean | null;
  };
};
