// ===============================
// IMPORTS
// ===============================

import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

// ===============================
// APP SETUP
// ===============================

const app = express();
const PORT = process.env.PORT || 3000;

// These lines recreate __dirname because this project uses ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public folder.
// This includes CSS, client-side JS, images, backgrounds, and icons.
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// WEATHER STATE HELPERS
// ===============================

// Converts Open-Meteo weather values into simple visual states
// used by the front-end scene system.
function getWeatherState({
  windSpeed,
  precipitation,
  snowfall,
  cloudCover,
  visibility,
  humidity,
  weatherCode
}) {
  const rain = Number(precipitation ?? 0);
  const snow = Number(snowfall ?? 0);
  const wind = Number(windSpeed ?? 0);
  const clouds = Number(cloudCover ?? 0);
  const humidityValue = Number(humidity ?? 0);
  const visibilityValue = Number(visibility ?? 10000);
  const code = Number(weatherCode ?? -1);

  if ([95, 96, 99].includes(code) || rain >= 4) return "stormy";
  if ([71, 73, 75, 77, 85, 86].includes(code) || snow > 0.15) return "snowy";
  if ([56, 57, 66, 67].includes(code)) return "sleety";

  if (
    code === 45 ||
    code === 48 ||
    (visibilityValue < 1000 && humidityValue > 90)
  ) {
    return "foggy";
  }

  if (visibilityValue < 3000 && humidityValue > 80) return "misty";

  if (
    [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) ||
    rain > 0.2
  ) {
    return "rainy";
  }

  if (clouds > 60) return "cloudy";
  if (wind >= 9) return "windy";

  return "clear";
}

// Converts temperature into a simple state for visual styling.
function getTempState(apparentTemperature, airTemperature) {
  const temp = Number(apparentTemperature ?? airTemperature);

  if (Number.isNaN(temp)) return "mild";
  if (temp <= 0) return "freezing";
  if (temp <= 10) return "cold";
  if (temp < 22) return "mild";
  if (temp < 30) return "warm";

  return "hot";
}

// Works out whether the current time is day, night, sunrise, or sunset.
function getTimeState(currentTime, sunrise, sunset) {
  if (!currentTime || !sunrise || !sunset) return "day";

  const now = new Date(currentTime).getTime();
  const rise = new Date(sunrise).getTime();
  const set = new Date(sunset).getTime();

  if ([now, rise, set].some(Number.isNaN)) return "day";

  const sunriseStart = rise - 45 * 60 * 1000;
  const sunriseEnd = rise + 60 * 60 * 1000;
  const sunsetStart = set - 60 * 60 * 1000;
  const sunsetEnd = set + 45 * 60 * 1000;

  if (now >= sunriseStart && now <= sunriseEnd) return "sunrise";
  if (now >= sunsetStart && now <= sunsetEnd) return "sunset";
  if (now > sunriseEnd && now < sunsetStart) return "day";

  return "night";
}

// Detects the season based on date and hemisphere.
function getSeasonState(currentTime, latitude) {
  const date = currentTime ? new Date(currentTime) : new Date();
  const month = date.getUTCMonth() + 1;
  const isNorthernHemisphere = Number(latitude) >= 0;

  if (isNorthernHemisphere) {
    if ([3, 4, 5].includes(month)) return "spring";
    if ([6, 7, 8].includes(month)) return "summer";
    if ([9, 10, 11].includes(month)) return "autumn";
    return "winter";
  }

  if ([3, 4, 5].includes(month)) return "autumn";
  if ([6, 7, 8].includes(month)) return "winter";
  if ([9, 10, 11].includes(month)) return "spring";

  return "summer";
}

// Adds optional holiday states for themed visual overlays.
function getHolidayState(currentTime) {
  const date = currentTime ? new Date(currentTime) : new Date();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if (month === 12 && day >= 1 && day <= 26) return "christmas";
  if ((month === 12 && day === 31) || (month === 1 && day <= 2)) return "newyear";
  if (month === 2 && day >= 10 && day <= 15) return "valentines";
  if (month === 10 && day >= 24 && day <= 31) return "halloween";

  return "none";
}

// Creates labels like Today, Monday, Tuesday, etc. for the forecast.
function getDayLabel(dateString, index) {
  if (index === 0) return "Today";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-US", { weekday: "long" });
}

// ===============================
// GEOCODING HELPERS
// ===============================

// Converts a city name into coordinates using Open-Meteo's geocoding API.
async function geocodeCity(city) {
  const response = await axios.get(
    "https://geocoding-api.open-meteo.com/v1/search",
    {
      params: {
        name: city.trim(),
        count: 1,
        language: "en",
        format: "json"
      }
    }
  );

  return response.data.results?.[0] || null;
}

// Converts coordinates into a readable city/country using Nominatim.
async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat,
          lon: lng,
          format: "jsonv2",
          addressdetails: 1
        },
        headers: {
          "User-Agent": "WeatherOrNot/1.0"
        }
      }
    );

    const address = response.data?.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      "Your Location";

    const country = address.country || "";

    return { city, country };
  } catch (error) {
    console.error("Reverse geocoding error:", error.response?.data || error.message);
    return { city: "Your Location", country: "" };
  }
}

// ===============================
// OPEN-METEO API REQUEST
// ===============================

// Fetches weather data from Open-Meteo and formats it for the front end.
async function fetchOpenMeteoWeather(lat, lng) {
  const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: lat,
      longitude: lng,
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "pressure_msl",
        "surface_pressure",
        "visibility",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "uv_index"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "sunrise",
        "sunset",
        "daylight_duration",
        "sunshine_duration",
        "uv_index_max",
        "uv_index_clear_sky_max"
      ].join(","),
      timezone: "auto",
      forecast_days: 7
    }
  });

  const data = response.data;
  const current = data.current || {};
  const daily = data.daily || {};

  // Current weather values
  const airTemperature = current.temperature_2m ?? null;
  const apparentTemperature = current.apparent_temperature ?? null;
  const windSpeed = current.wind_speed_10m ?? null;
  const windDirection = current.wind_direction_10m ?? null;
  const windGusts = current.wind_gusts_10m ?? null;
  const humidity = current.relative_humidity_2m ?? null;
  const cloudCover = current.cloud_cover ?? null;
  const cloudCoverLow = current.cloud_cover_low ?? null;
  const cloudCoverMid = current.cloud_cover_mid ?? null;
  const cloudCoverHigh = current.cloud_cover_high ?? null;
  const visibility = current.visibility ?? null;
  const precipitation = current.precipitation ?? null;
  const rain = current.rain ?? null;
  const showers = current.showers ?? null;
  const snowfall = current.snowfall ?? null;
  const weatherCode = current.weather_code ?? null;
  const isDay = current.is_day ?? null;
  const seaLevelPressure = current.pressure_msl ?? null;
  const surfacePressure = current.surface_pressure ?? null;
  const uvIndex = current.uv_index ?? null;
  const time = current.time ?? null;

  // Daily values
  const sunrise = daily.sunrise?.[0] ?? null;
  const sunset = daily.sunset?.[0] ?? null;
  const daylightDuration = daily.daylight_duration?.[0] ?? null;
  const sunshineDuration = daily.sunshine_duration?.[0] ?? null;
  const uvIndexMax = daily.uv_index_max?.[0] ?? null;
  const uvIndexClearSkyMax = daily.uv_index_clear_sky_max?.[0] ?? null;

  // Scene states used by the animated front end.
  const weatherState = getWeatherState({
    windSpeed,
    precipitation,
    snowfall,
    cloudCover,
    visibility,
    humidity,
    weatherCode
  });

  const tempState = getTempState(apparentTemperature, airTemperature);
  const timeState = getTimeState(time, sunrise, sunset);
  const seasonState = getSeasonState(time, lat);
  const holidayState = getHolidayState(time);

  // Build a 7-day forecast array for the UI.
  const weeklyForecast = (daily.time || []).map((date, index) => {
    const dailyWeatherCode = daily.weather_code?.[index] ?? null;
    const maxTemp = daily.temperature_2m_max?.[index] ?? null;
    const minTemp = daily.temperature_2m_min?.[index] ?? null;
    const rainChance = daily.precipitation_probability_max?.[index] ?? null;

    const dayWeatherState = getWeatherState({
      windSpeed: 0,
      precipitation: rainChance ? rainChance / 25 : 0,
      snowfall: 0,
      cloudCover: 0,
      visibility: 10000,
      humidity: 50,
      weatherCode: dailyWeatherCode
    });

    return {
      date,
      dayLabel: getDayLabel(date, index),
      weatherCode: dailyWeatherCode,
      weatherState: dayWeatherState,
      rainChance,
      maxTemp,
      minTemp
    };
  });

  return {
    time,
    timezone: data.timezone ?? null,
    utcOffsetSeconds: data.utc_offset_seconds ?? null,

    airTemperature,
    apparentTemperature,
    windSpeed,
    windDirection,
    windGusts,
    humidity,
    cloudCover,
    cloudCoverLow,
    cloudCoverMid,
    cloudCoverHigh,
    visibility,
    precipitation,
    rain,
    showers,
    snowfall,
    weatherCode,
    isDay,
    seaLevelPressure,
    surfacePressure,
    uvIndex,

    sunrise,
    sunset,
    daylightDuration,
    sunshineDuration,
    uvIndexMax,
    uvIndexClearSkyMax,

    // These are left as null because moon timing is handled visually on the front end.
    moonrise: null,
    moonset: null,
    moonPhase: null,
    moonFraction: null,

    weeklyForecast,

    scene: {
      timeState,
      weatherState,
      tempState,
      seasonState,
      holidayState
    }
  };
}

// ===============================
// ROUTES
// ===============================

// GET /weather
// Used when the user clicks "Use My Location".
// Requires latitude and longitude query parameters.
app.get("/weather", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "Please provide both lat and lng."
      });
    }

    const weather = await fetchOpenMeteoWeather(lat, lng);
    const place = await reverseGeocode(lat, lng);

    res.json({
      lat: Number(lat),
      lng: Number(lng),
      city: place.city,
      country: place.country,
      ...weather
    });
  } catch (error) {
    console.error("Open-Meteo /weather error:", error.response?.data || error.message);

    res.status(error.response?.status || 500).json({
      error: "Failed to fetch weather data.",
      details: error.response?.data || error.message
    });
  }
});

// GET /city-weather
// Used when the user searches for a city name.
app.get("/city-weather", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city || !city.trim()) {
      return res.status(400).json({
        error: "Please enter a city name."
      });
    }

    const place = await geocodeCity(city);

    if (!place) {
      return res.status(404).json({
        error: "City not found."
      });
    }

    const weather = await fetchOpenMeteoWeather(place.latitude, place.longitude);

    res.json({
      city: place.name || city.trim(),
      country: place.country || "",
      lat: place.latitude,
      lng: place.longitude,
      ...weather
    });
  } catch (error) {
    console.error("Open-Meteo /city-weather error:", error.response?.data || error.message);

    res.status(error.response?.status || 500).json({
      error: "Failed to fetch weather data.",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});