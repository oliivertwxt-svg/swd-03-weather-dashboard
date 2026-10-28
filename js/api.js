const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    throw new Error(`Network request failed: ${error.message}`, { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Weather service returned ${response.status} ${response.statusText}.`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Weather service returned invalid JSON: ${error.message}`, { cause: error });
  }
}

export async function searchCity(name, signal) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  try {
    const data = await fetchJson(url, signal);
    return data.results ?? [];
  } catch (error) {
    throw new Error(`Could not search for "${name}": ${error.message}`, { cause: error });
  }
}

export async function getForecast(lat, lon, signal) {
  const params = new URLSearchParams({
    latitude: `${lat}`,
    longitude: `${lon}`,
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });
  try {
    return await fetchJson(`${FORECAST_URL}?${params}`, signal);
  } catch (error) {
    throw new Error(`Could not load the forecast: ${error.message}`, { cause: error });
  }
}
