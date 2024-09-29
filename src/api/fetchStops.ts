import { QueryFunctionContext } from "@tanstack/react-query";

export const fetchStops = async ({ queryKey }: QueryFunctionContext) => {
  const [_key, stops] = queryKey;
  if ((stops as string[]).length === 0) return null;
  const encoded = encodeURIComponent(JSON.stringify({ 0: stops }));
  const response = await fetch(
    `https://api.golemio.cz/v2/public/departureboards?stopIds=${encoded}&limit=30&minutesAfter=360`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
  return response.json();
};
