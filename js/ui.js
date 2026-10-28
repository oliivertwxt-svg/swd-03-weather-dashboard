import { getWeatherCode } from "./weatherCodes.js";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function formatTemperature(celsius, unit) {
  const temperature = unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
  return `${Math.round(temperature)}°`;
}

export function renderWeather(weather, elements, unit = "C") {
  const now = new Date();
  elements.city.textContent = [weather.city, weather.country].filter(Boolean).join(", ");
  elements.date.textContent = `Today · ${dateFormatter.format(now)}`;
  elements.temperature.textContent = formatTemperature(weather.temperature, unit);
  elements.temperature.nextElementSibling.textContent = unit;
  elements.condition.textContent = weather.condition;
  elements.icon.textContent = weather.icon;
  elements.windSpeed.textContent = `${weather.windSpeed} km/h`;
  elements.humidity.textContent = `${weather.humidity}%`;
  elements.localTime.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: weather.timezone,
  }).format(now);
  elements.forecast.replaceChildren(
    ...weather.forecast.map((day) => {
      const forecastCode = getWeatherCode(day.weatherCode);
      const forecastDate = new Date(`${day.date}T12:00:00Z`);
      const card = document.createElement("article");
      card.className = "forecast-card";
      card.setAttribute(
        "aria-label",
        `${dateFormatter.format(forecastDate)}: ${forecastCode.label}, high ${formatTemperature(day.high, unit)}, low ${formatTemperature(day.low, unit)}`,
      );

      const dayName = document.createElement("span");
      dayName.className = "forecast-day";
      dayName.textContent =
        day.date === weather.currentDate
          ? "Today"
          : new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(forecastDate);
      const icon = document.createElement("span");
      icon.className = "forecast-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = forecastCode.emoji;
      const condition = document.createElement("span");
      condition.className = "forecast-condition";
      condition.textContent = forecastCode.label;
      const temperatures = document.createElement("span");
      temperatures.className = "forecast-temperatures";
      const high = document.createElement("span");
      high.textContent = formatTemperature(day.high, unit);
      const low = document.createElement("span");
      low.className = "forecast-low";
      low.textContent = formatTemperature(day.low, unit);
      temperatures.append(high, low);
      card.append(dayName, icon, condition, temperatures);
      return card;
    }),
  );
}

export function renderFavourites(favourites, currentCity, list, emptyMessage, count) {
  const entries = favourites.map((city) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "favourite-city";
    button.type = "button";
    button.dataset.cityKey = `${city.latitude},${city.longitude}`;
    button.setAttribute("aria-current", button.dataset.cityKey === currentCity ? "true" : "false");

    const copy = document.createElement("span");
    copy.className = "favourite-city-copy";
    const name = document.createElement("span");
    name.className = "favourite-city-name";
    name.textContent = city.name;
    copy.append(name);
    if (city.country) {
      const country = document.createElement("span");
      country.className = "favourite-city-condition";
      country.textContent = city.country;
      copy.append(country);
    }

    button.append(copy);
    item.append(button);
    return item;
  });

  list.replaceChildren(...entries);
  emptyMessage.hidden = favourites.length > 0;
  count.textContent = `${favourites.length}`;
}

export function setFavoriteButton(button, label, isFavorite) {
  button.setAttribute("aria-pressed", `${isFavorite}`);
  button.querySelector("span").textContent = isFavorite ? "★" : "☆";
  label.textContent = isFavorite ? "Remove from favourites" : "Add to favourites";
  button.setAttribute("aria-label", label.textContent);
}

export function setWeatherLoading(elements, isLoading) {
  elements.dashboard.setAttribute("aria-busy", `${isLoading}`);
  elements.currentCard.classList.toggle("is-loading", isLoading);

  if (isLoading) {
    elements.currentCard.querySelector(".loading-skeleton")?.remove();
    const skeleton = document.createElement("div");
    skeleton.className = "loading-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    for (const className of ["skeleton-heading", "skeleton-line", "skeleton-temperature", "skeleton-condition", "skeleton-details"]) {
      const block = document.createElement("span");
      block.className = `skeleton-block ${className}`;
      skeleton.append(block);
    }
    elements.currentCard.append(skeleton);

    const cards = Array.from({ length: 7 }, () => {
      const card = document.createElement("div");
      card.className = "forecast-card forecast-card--skeleton";
      card.setAttribute("aria-hidden", "true");
      for (const className of ["skeleton-day", "skeleton-icon", "skeleton-temperatures"]) {
        const block = document.createElement("span");
        block.className = `skeleton-block ${className}`;
        card.append(block);
      }
      return card;
    });
    elements.forecast.replaceChildren(...cards);
    elements.status.textContent = "Loading weather forecast…";
    elements.status.classList.add("sr-only");
    elements.status.hidden = false;
    elements.error.hidden = true;
    return;
  }

  elements.currentCard.querySelector(".loading-skeleton")?.remove();
  if (elements.forecast.querySelector(".forecast-card--skeleton")) {
    elements.forecast.replaceChildren();
  }
  elements.status.classList.remove("sr-only");
  elements.status.hidden = true;
}

export function setStatus(status, error, message = "", isError = false) {
  status.hidden = !message || isError;
  error.hidden = !message || !isError;
  if (message) {
    (isError ? error : status).textContent = message;
  }
}
