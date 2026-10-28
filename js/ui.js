import { getWeatherCode } from "./weatherCodes.js";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function renderWeather(weather, elements) {
  const now = new Date();
  elements.city.textContent = `${weather.city}, ${weather.country}`;
  elements.date.textContent = `Today · ${dateFormatter.format(now)}`;
  elements.temperature.textContent = `${Math.round(weather.temperature)}°`;
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
        `${dateFormatter.format(forecastDate)}: ${forecastCode.label}, high ${day.high}, low ${day.low}`,
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
      high.textContent = `${Math.round(day.high)}°`;
      const low = document.createElement("span");
      low.className = "forecast-low";
      low.textContent = `${Math.round(day.low)}°`;
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
    button.dataset.city = city.city;
    button.dataset.cityKey = city.place.id ?? `${city.city},${city.country}`;
    button.setAttribute("aria-current", city.city === currentCity ? "true" : "false");

    const copy = document.createElement("span");
    copy.className = "favourite-city-copy";
    const name = document.createElement("span");
    name.className = "favourite-city-name";
    name.textContent = city.city;
    const condition = document.createElement("span");
    condition.className = "favourite-city-condition";
    condition.textContent = city.condition;
    copy.append(name, condition);

    const weather = document.createElement("span");
    weather.className = "favourite-city-weather";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = city.icon;
    const temperature = document.createElement("strong");
    temperature.textContent = `${Math.round(city.temperature)}°`;
    weather.append(icon, temperature);

    button.append(copy, weather);
    item.append(button);
    return item;
  });

  list.replaceChildren(...entries);
  emptyMessage.hidden = favourites.length > 0;
  count.textContent = `${favourites.length}`;
}

export function setFavoriteButton(button, label, isFavorite) {
  button.setAttribute("aria-pressed", `${isFavorite}`);
  button.querySelector("span").textContent = isFavorite ? "♥" : "♡";
  label.textContent = isFavorite ? "Remove from favourites" : "Add to favourites";
}

export function setStatus(status, error, message = "", isError = false) {
  status.hidden = !message || isError;
  error.hidden = !message || !isError;
  if (message) {
    (isError ? error : status).textContent = message;
  }
}
