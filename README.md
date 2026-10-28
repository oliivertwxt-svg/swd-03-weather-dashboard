# Atmos Weather Dashboard

Atmos is a responsive weather dashboard for checking current conditions and the forecast for the week ahead.

## Features

- Search for a city and choose from matching locations.
- View current conditions and a seven-day forecast.
- Switch between Celsius and Fahrenheit; the preference is saved in the browser.
- Save and remove favourite locations, then select a favourite to load its forecast.
- Use the browser's location permission to load the forecast for your current coordinates.
- Restore the last viewed city on startup. If location permission was already granted, Atmos uses the current location instead.
- Keep saved preferences and locations in `localStorage`.

## APIs

Atmos uses the free [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) to search for cities and the [Open-Meteo Forecast API](https://open-meteo.com/en/docs) for current conditions and daily forecast data. No API key is required.

## Screenshots

<!-- Add dashboard screenshots here. -->

## What I learned

- Fetching geocoded locations and weather data with browser APIs.
- Handling ambiguous city searches and cancelling outdated requests with `AbortController`.
- Using the Geolocation API and providing helpful permission and error feedback.
- Persisting user preferences and favourite locations with `localStorage`.
- Building UI cards with DOM nodes and `textContent` to keep API-provided values from being interpreted as HTML.
- Converting units and animating loading skeletons with CSS.

## Run locally

Open `index.html` from a local web server. The app uses JavaScript modules, and browser geolocation requires a secure context such as `localhost` or HTTPS.
