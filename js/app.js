import { getForecast, searchCity } from "./api.js";
import { renderFavourites, renderWeather, setFavoriteButton, setStatus } from "./ui.js";
import { getWeatherCode } from "./weatherCodes.js";

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#city-search"),
  locationChoice: document.querySelector("#location-choice"),
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
  unitToggle: document.querySelector(".unit-toggle"),
  status: document.querySelector("#status-message"),
  error: document.querySelector("#error-message"),
};

let currentWeather;
let currentUnit = localStorage.getItem("atmos-temperature-unit") === "F" ? "F" : "C";
let requestController;
let locationChoices = [];
const favourites = new Map();

function getPlaceLabel(place) {
  return [place.name, place.admin1, place.country]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", ");
}

function showLocationChoices(places) {
  locationChoices = places;
  const prompt = document.createElement("option");
  prompt.value = "";
  prompt.textContent = "Choose a location...";
  prompt.disabled = true;
  prompt.selected = true;
  const options = places.map((place, index) => {
    const option = document.createElement("option");
    option.value = `${index}`;
    option.textContent = getPlaceLabel(place);
    return option;
  });
  elements.locationChoice.replaceChildren(prompt, ...options);
  elements.locationChoice.hidden = false;
}

function clearLocationChoices() {
  locationChoices = [];
  elements.locationChoice.replaceChildren();
  elements.locationChoice.hidden = true;
}

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
    currentUnit,
  );
  setFavoriteButton(
    elements.favoriteToggle,
    elements.favoriteLabel,
    favourites.has(getFavouriteKey(currentWeather)),
  );
}

async function loadCity(cityName, savedWeather = null, selectedPlace = null) {
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  clearLocationChoices();
  setStatus(elements.status, elements.error, "Loading…");

  try {
    let place;
    if (savedWeather) {
      place = savedWeather.place;
    } else if (selectedPlace) {
      place = selectedPlace;
    } else {
      const places = await searchCity(cityName, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      if (places.length > 1) {
        showLocationChoices(places);
        setStatus(elements.status, elements.error, "Choose a location from the matching results.");
        return;
      }
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

    const forecastData = await getForecast(place.latitude, place.longitude, controller.signal);
    if (controller.signal.aborted) {
      return;
    }
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
    renderWeather(currentWeather, elements, currentUnit);
    updateFavourites();
    elements.input.value = "";
    setStatus(elements.status, elements.error);
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    console.error("Unable to load weather data from Open-Meteo.", error);
    setStatus(
      elements.status,
      elements.error,
      `We couldn't load the weather right now. ${error.message}`,
      true,
    );
  } finally {
    if (requestController === controller) {
      requestController = null;
    }
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const cityName = elements.input.value.trim();
  if (cityName) {
    loadCity(cityName);
  }
});

elements.locationChoice.addEventListener("change", () => {
  const place = locationChoices[Number(elements.locationChoice.value)];
  if (place) {
    loadCity(elements.input.value.trim(), null, place);
  }
});

elements.unitToggle.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-unit]");
  if (!button || button.dataset.unit === currentUnit) {
    return;
  }

  currentUnit = button.dataset.unit;
  localStorage.setItem("atmos-temperature-unit", currentUnit);
  elements.unitToggle.querySelectorAll("button[data-unit]").forEach((option) => {
    option.setAttribute("aria-pressed", `${option.dataset.unit === currentUnit}`);
  });
  if (currentWeather) {
    renderWeather(currentWeather, elements, currentUnit);
    updateFavourites();
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

elements.unitToggle.querySelectorAll("button[data-unit]").forEach((option) => {
  option.setAttribute("aria-pressed", `${option.dataset.unit === currentUnit}`);
});

loadCity("San Francisco");
