import { getForecast, searchCity } from "./api.js";
import {
  renderFavourites,
  renderWeather,
  setFavoriteButton,
  setStatus,
  setWeatherLoading,
} from "./ui.js";
import { getWeatherCode } from "./weatherCodes.js";

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#city-search"),
  locationChoice: document.querySelector("#location-choice"),
  locationButton: document.querySelector("#use-location"),
  city: document.querySelector("#current-heading"),
  date: document.querySelector("#hero-date"),
  temperature: document.querySelector("#temperature"),
  condition: document.querySelector("#condition"),
  icon: document.querySelector("#weather-icon"),
  windSpeed: document.querySelector("#wind-speed"),
  humidity: document.querySelector("#humidity"),
  localTime: document.querySelector("#local-time"),
  forecast: document.querySelector("#forecast-grid"),
  currentCard: document.querySelector(".current-card"),
  dashboard: document.querySelector(".dashboard"),
  favoriteToggle: document.querySelector("#favorite-toggle"),
  favoriteLabel: document.querySelector("#favorite-label"),
  favouritesList: document.querySelector("#favourites-list"),
  emptyFavourites: document.querySelector("#empty-favourites"),
  favouriteCount: document.querySelector("#favourite-count"),
  unitToggle: document.querySelector(".unit-toggle"),
  status: document.querySelector("#status-message"),
  error: document.querySelector("#error-message"),
};

function isLocationRecord(value) {
  return (
    value &&
    typeof value.name === "string" &&
    typeof value.country === "string" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude)
  );
}

function getLocationKey(location) {
  return `${location.latitude},${location.longitude}`;
}

function readLocationRecords(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return [];
    }

    const records = JSON.parse(stored);
    if (!Array.isArray(records)) {
      throw new TypeError(`Stored ${key} value must be an array.`);
    }
    const validRecords = records.filter(isLocationRecord);
    if (validRecords.length !== records.length) {
      throw new TypeError(`Stored ${key} value contains invalid locations.`);
    }
    return validRecords;
  } catch (error) {
    console.error(`Unable to read stored locations from "${key}".`, error);
    setStatus(elements.status, elements.error, "Saved locations could not be read from this browser.", true);
    return [];
  }
}

function readLastLocation() {
  try {
    const stored = localStorage.getItem("atmos-last-location");
    if (!stored) {
      return null;
    }
    const location = JSON.parse(stored);
    if (!isLocationRecord(location)) {
      throw new TypeError("Stored last location is invalid.");
    }
    return location;
  } catch (error) {
    console.error("Unable to read the last viewed location.", error);
    setStatus(elements.status, elements.error, "The last viewed city could not be restored.", true);
    return null;
  }
}

function persistLocation(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save location data to "${key}".`, error);
    setStatus(elements.status, elements.error, "Weather loaded, but this browser could not save your location data.", true);
    return false;
  }
}

let currentWeather;
let currentUnit = "C";
try {
  currentUnit = localStorage.getItem("atmos-temperature-unit") === "F" ? "F" : "C";
} catch (error) {
  console.error("Unable to read the temperature preference.", error);
}
let requestController;
let requestId = 0;
let locationChoices = [];
const favourites = new Map(
  readLocationRecords("atmos-favourites").map((location) => [getLocationKey(location), location]),
);
const lastLocation = readLastLocation();

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

function updateFavourites() {
  renderFavourites(
    [...favourites.values()],
    currentWeather ? getLocationKey(currentWeather.place) : "",
    elements.favouritesList,
    elements.emptyFavourites,
    elements.favouriteCount,
  );
  const isFavorite = currentWeather && favourites.has(getLocationKey(currentWeather.place));
  setFavoriteButton(elements.favoriteToggle, elements.favoriteLabel, Boolean(isFavorite));
  elements.favoriteToggle.disabled = !currentWeather;
}

async function loadCity(cityName, selectedPlace = null) {
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  const activeRequestId = ++requestId;
  elements.locationButton.disabled = false;
  clearLocationChoices();
  setWeatherLoading(elements, true);

  let loaded = false;
  try {
    let place = selectedPlace;
    if (!place) {
      const places = await searchCity(cityName, controller.signal);
      if (controller.signal.aborted || activeRequestId !== requestId) {
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
    if (controller.signal.aborted || activeRequestId !== requestId) {
      return;
    }

    const currentCode = getWeatherCode(forecastData.current.weather_code);
    currentWeather = {
      place,
      city: place.name,
      country: place.country ?? "",
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
    loaded = true;
    setStatus(elements.status, elements.error);
    persistLocation("atmos-last-location", {
      name: place.name,
      country: place.country ?? "",
      latitude: place.latitude,
      longitude: place.longitude,
    });
  } catch (error) {
    if (controller.signal.aborted || activeRequestId !== requestId) {
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
      setWeatherLoading(elements, false);
      if (!loaded && currentWeather) {
        renderWeather(currentWeather, elements, currentUnit);
        updateFavourites();
      }
    }
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

function getGeolocationErrorMessage(error) {
  if (error.code === 1) {
    return "Location permission was denied. Allow location access in your browser settings, or search for a city.";
  }
  if (error.code === 2) {
    return "Your location is unavailable right now. Check your device's location settings or search for a city.";
  }
  if (error.code === 3) {
    return "Finding your location took too long. Please try again or search for a city.";
  }
  return `We couldn't access your location. ${error.message || "Please try again or search for a city."}`;
}

async function loadCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus(
      elements.status,
      elements.error,
      "Location is not supported by this browser. Search for a city instead.",
      true,
    );
    return;
  }

  requestController?.abort();
  requestController = null;
  const activeRequestId = ++requestId;
  clearLocationChoices();
  setWeatherLoading(elements, true);
  elements.locationButton.disabled = true;

  try {
    const position = await getCurrentPosition();
    if (activeRequestId !== requestId) {
      return;
    }
    elements.locationButton.disabled = false;
    await loadCity("My location", {
      name: "My location",
      country: "",
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
  } catch (error) {
    if (activeRequestId !== requestId) {
      return;
    }
    console.error("Unable to access the device location.", error);
    setWeatherLoading(elements, false);
    elements.locationButton.disabled = false;
    setStatus(elements.status, elements.error, getGeolocationErrorMessage(error), true);
    if (currentWeather) {
      renderWeather(currentWeather, elements, currentUnit);
      updateFavourites();
    }
  }
}

function saveFavourites() {
  persistLocation("atmos-favourites", [...favourites.values()]);
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
    loadCity(elements.input.value.trim(), place);
  }
});

elements.locationButton.addEventListener("click", loadCurrentLocation);

elements.unitToggle.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-unit]");
  if (!button || button.dataset.unit === currentUnit) {
    return;
  }

  currentUnit = button.dataset.unit;
  try {
    localStorage.setItem("atmos-temperature-unit", currentUnit);
  } catch (error) {
    console.error("Unable to save the temperature preference.", error);
    setStatus(elements.status, elements.error, "The temperature unit could not be saved in this browser.", true);
  }
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

  const location = {
    name: currentWeather.city,
    country: currentWeather.country,
    latitude: currentWeather.place.latitude,
    longitude: currentWeather.place.longitude,
  };
  const key = getLocationKey(location);
  if (favourites.has(key)) {
    favourites.delete(key);
  } else {
    favourites.set(key, location);
  }
  updateFavourites();
  saveFavourites();
});

elements.favouritesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-city-key]");
  if (button) {
    const location = favourites.get(button.dataset.cityKey);
    if (location) {
      loadCity(location.name, location);
    }
  }
});

elements.unitToggle.querySelectorAll("button[data-unit]").forEach((option) => {
  option.setAttribute("aria-pressed", `${option.dataset.unit === currentUnit}`);
});
updateFavourites();

async function restoreInitialLocation() {
  const initialRequestId = requestId;
  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "granted" && requestId === initialRequestId) {
        await loadCurrentLocation();
        return;
      }
    } catch (error) {
      console.error("Unable to check geolocation permission.", error);
    }
  }

  if (requestId === initialRequestId) {
    loadCity(lastLocation?.name ?? "San Francisco", lastLocation);
  }
}

restoreInitialLocation();
