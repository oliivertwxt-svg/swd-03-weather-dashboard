import { getForecast, searchCity } from "./api.js";
import { renderFavourites, renderWeather, setFavoriteButton, setStatus } from "./ui.js";
import { getWeatherCode } from "./weatherCodes.js";

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#city-search"),
  city: document.querySelector("#current-heading"),
  date: document.querySelector("#hero-date"),
  temperature: document.querySelector("#temperature"),
  condition: document.querySelector("#condition"),
  icon: document.querySelector("#weather-icon"),
  windSpeed: document.querySelector("#wind-speed"),
  humidity: document.querySelector("#humidity"),
  localTime: document.querySelector("#local-time"),
  forecast: document.querySelector("#forecast-grid"),
  favoriteToggle: document.querySelector("#favorite-toggle"),
  favoriteLabel: document.querySelector("#favorite-label"),
  favouritesList: document.querySelector("#favourites-list"),
  emptyFavourites: document.querySelector("#empty-favourites"),
  favouriteCount: document.querySelector("#favourite-count"),
  status: document.querySelector("#status-message"),
  error: document.querySelector("#error-message"),
};

let currentWeather;
const favourites = new Map();

function getFavouriteKey(weather) {
  return String(weather.place.id ?? `${weather.city},${weather.country}`);
}

function updateFavourites() {
  renderFavourites(
    [...favourites.values()],
    currentWeather.city,
    elements.favouritesList,
    elements.emptyFavourites,
    elements.favouriteCount,
  );
  setFavoriteButton(
    elements.favoriteToggle,
    elements.favoriteLabel,
    favourites.has(getFavouriteKey(currentWeather)),
  );
}

async function loadCity(cityName, savedWeather = null) {
  const submitButton = elements.form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Loading…";
  setStatus(elements.status, elements.error, "Loading…");

  try {
    let place;
    if (savedWeather) {
      place = savedWeather.place;
    } else {
      const places = await searchCity(cityName);
      place = places[0];
    }

    if (!place) {
      setStatus(
        elements.status,
        elements.error,
        `We couldn't find "${cityName}". Check the spelling or try a nearby city.`,
        true,
      );
      return;
    }

    const forecastData = await getForecast(place.latitude, place.longitude);
    const currentCode = getWeatherCode(forecastData.current.weather_code);
    currentWeather = {
      place,
      city: place.name,
      country: place.country,
      timezone: forecastData.timezone,
      currentDate: forecastData.current.time.slice(0, 10),
      temperature: forecastData.current.temperature_2m,
      humidity: forecastData.current.relative_humidity_2m,
      condition: currentCode.label,
      icon: currentCode.emoji,
      windSpeed: forecastData.current.wind_speed_10m,
      forecast: forecastData.daily.time.map((date, index) => ({
        date,
        weatherCode: forecastData.daily.weather_code[index],
        high: forecastData.daily.temperature_2m_max[index],
        low: forecastData.daily.temperature_2m_min[index],
      })),
    };
    renderWeather(currentWeather, elements);
    updateFavourites();
    elements.input.value = "";
    setStatus(elements.status, elements.error);
  } catch (error) {
    console.error("Unable to load weather data from Open-Meteo.", error);
    setStatus(
      elements.status,
      elements.error,
      `We couldn't load the weather right now. ${error.message}`,
      true,
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Search";
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const cityName = elements.input.value.trim();
  if (cityName) {
    loadCity(cityName);
  }
});

elements.favoriteToggle.addEventListener("click", () => {
  if (!currentWeather) {
    return;
  }

  const key = getFavouriteKey(currentWeather);
  if (favourites.has(key)) {
    favourites.delete(key);
  } else {
    favourites.set(key, currentWeather);
  }
  updateFavourites();
});

elements.favouritesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-city-key]");
  if (button) {
    const weather = favourites.get(button.dataset.cityKey);
    if (weather) {
      loadCity(weather.city, weather);
    }
  }
});

loadCity("San Francisco");
