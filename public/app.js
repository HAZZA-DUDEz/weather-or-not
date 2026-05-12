const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("city");
const result = document.getElementById("result");
const locationBtn = document.getElementById("locationBtn");
const body = document.body;
const rainLayer = document.getElementById("rainLayer");
const snowLayer = document.getElementById("snowLayer");
const starsLayer = document.getElementById("starsLayer");
const fogLayer = document.getElementById("fogLayer");
const sunOrb = document.getElementById("sunOrb");
const moonOrb = document.getElementById("moonOrb");
const moonPhaseMask = document.getElementById("moonPhaseMask");
const auroraLayer = document.getElementById("auroraLayer");
const recentSearchesContainer = document.getElementById("recentSearches");
const skyEffectsLayer = document.getElementById("skyEffectsLayer");
const backgroundScene = document.querySelector(".background-scene");
const seasonScenery = document.getElementById("seasonScenery");

/* --------------------------
   ADMIN PANEL
-------------------------- */
const adminToggle = document.getElementById("adminToggle");
const adminPanel = document.getElementById("adminPanel");
const adminClose = document.getElementById("adminClose");
const adminApply = document.getElementById("adminApply");
const adminReset = document.getElementById("adminReset");
const adminTheme = document.getElementById("adminTheme");
const adminTimeOfDay = document.getElementById("adminTimeOfDay");
const adminCloudCover = document.getElementById("adminCloudCover");
const adminRain = document.getElementById("adminRain");
const adminVisibility = document.getElementById("adminVisibility");
const adminHumidity = document.getElementById("adminHumidity");
const adminTemp = document.getElementById("adminTemp");
const adminWind = document.getElementById("adminWind");
const adminMoonPhase = document.getElementById("adminMoonPhase");
const adminSkyEvent = document.getElementById("adminSkyEvent");
const adminOverrideSkyEvent = document.getElementById("adminOverrideSkyEvent");
const adminForceInvalidSkyEvent = document.getElementById("adminForceInvalidSkyEvent");
const adminShowStars = document.getElementById("adminShowStars");
const adminShowSunMoon = document.getElementById("adminShowSunMoon");
const adminShowRainbow = document.getElementById("adminShowRainbow");
const adminForceAurora = document.getElementById("adminForceAurora");
const adminCloudCoverValue = document.getElementById("adminCloudCoverValue");
const adminRainValue = document.getElementById("adminRainValue");
const adminVisibilityValue = document.getElementById("adminVisibilityValue");
const adminHumidityValue = document.getElementById("adminHumidityValue");
const adminTempValue = document.getElementById("adminTempValue");
const adminWindValue = document.getElementById("adminWindValue");

let lastWeatherData = null;
let lastRainyData = null;
let lightningTimeout = null;
let rainbowTimeout = null;
let adminMode = false;

/* --------------------------
   HELPERS
-------------------------- */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isMobileView() {
  return window.innerWidth <= 768;
}

function getDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function formatValue(value, suffix = "") {
  if (value == null || value === "") return "N/A";
  return `${value}${suffix}`;
}

function isZeroLike(value) {
  return Number(value) === 0;
}

function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatClock(value, timezone) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  try {
    return new Intl.DateTimeFormat([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || undefined
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

function formatDateTime(value, timezone) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  try {
    return new Intl.DateTimeFormat([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || undefined
    }).format(date);
  } catch {
    return date.toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

function renderDetailItem(label, value, options = {}) {
  const { hideIfZero = false } = options;

  if (value == null || value === "" || value === "N/A") return "";
  if (hideIfZero && isZeroLike(value)) return "";

  return `
    <div class="detail-item">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `;
}

function getSeasonIcon(seasonState) {
  const icons = {
    spring: "🌸",
    summer: "☀️",
    autumn: "🍂",
    winter: "❄️"
  };
  return icons[seasonState] || "🌤️";
}

function getHolidayIcon(holidayState) {
  const icons = {
    christmas: "🎄",
    halloween: "🎃",
    valentines: "💝",
    easter: "🐰",
    newyear: "🎆",
    none: ""
  };
  return icons[holidayState] || "";
}

function getWeatherIcon(weatherState) {
  const icons = {
    clear: "☀️",
    cloudy: "☁️",
    rainy: "🌧️",
    stormy: "⛈️",
    snowy: "❄️",
    sleety: "🌨️",
    foggy: "🌫️",
    misty: "🌁",
    windy: "🌬️"
  };
  return icons[weatherState] || "🌤️";
}

function getForecastIcon(weatherState) {
  const icons = {
    clear: "☀️",
    cloudy: "☁️",
    rainy: "🌧️",
    stormy: "⛈️",
    snowy: "❄️",
    sleety: "🌨️",
    foggy: "🌫️",
    misty: "🌫️",
    windy: "🌬️"
  };
  return icons[weatherState] || "🌤️";
}

/* --------------------------
   SKY PALETTE
-------------------------- */

function getSkyPalette(weatherState, timeState) {
  const key = `${weatherState}-${timeState}`;

  const palettes = {
    "clear-day": { top: "#7fd6f1", mid: "#a8e4f5", bottom: "#e9fbff", glow: "rgba(255,255,255,0.16)", mask: "#a8e4f5" },
    "clear-night": { top: "#0d1733", mid: "#18254a", bottom: "#2c3c67", glow: "rgba(94,132,255,0.06)", mask: "#18254a" },
    "clear-sunrise": { top: "#ffb388", mid: "#ffd4a8", bottom: "#fff0d6", glow: "rgba(255,204,150,0.18)", mask: "#ffd4a8" },
    "clear-sunset": { top: "#f08b73", mid: "#f3b394", bottom: "#f8d6bb", glow: "rgba(255,177,120,0.16)", mask: "#f3b394" },

    "cloudy-day": { top: "#8fc9dd", mid: "#b6dce8", bottom: "#e6f3f8", glow: "rgba(255,255,255,0.10)", mask: "#b6dce8" },
    "cloudy-night": { top: "#1c2740", mid: "#2d3854", bottom: "#44516e", glow: "rgba(90,110,170,0.05)", mask: "#2d3854" },
    "cloudy-sunrise": { top: "#dca690", mid: "#e5c4b4", bottom: "#f2dfd8", glow: "rgba(255,240,225,0.08)", mask: "#e5c4b4" },
    "cloudy-sunset": { top: "#a97870", mid: "#c59d96", bottom: "#e0cac4", glow: "rgba(255,220,200,0.07)", mask: "#c59d96" },

    "rainy-day": {
  top: "#626d77",
  mid: "#7d8992",
  bottom: "#a7b0b7",
  glow: "rgba(255,255,255,0.015)",
  mask: "#7d8992"
},
    "rainy-night": { top: "#151b28", mid: "#232c3d", bottom: "#3b4659", glow: "rgba(80,98,120,0.04)", mask: "#232c3d" },
    "rainy-sunrise": { top: "#76808a", mid: "#9caab1", bottom: "#c7d0d5", glow: "rgba(255,255,255,0.04)", mask: "#9caab1" },
    "rainy-sunset": { top: "#65646d", mid: "#8e8d96", bottom: "#b7b7bf", glow: "rgba(255,255,255,0.03)", mask: "#8e8d96" },

    "stormy-day": { top: "#4c5d70", mid: "#617588", bottom: "#8fa3b3", glow: "rgba(255,255,255,0.02)", mask: "#617588" },
    "stormy-night": { top: "#0f141e", mid: "#1b2432", bottom: "#303c4e", glow: "rgba(255,255,255,0.02)", mask: "#1b2432" },
    "stormy-sunrise": { top: "#69676e", mid: "#8f8c93", bottom: "#bab8be", glow: "rgba(255,255,255,0.02)", mask: "#8f8c93" },
    "stormy-sunset": { top: "#5b575f", mid: "#807b85", bottom: "#aaa6ae", glow: "rgba(255,255,255,0.02)", mask: "#807b85" },

    "snowy-day": { top: "#b8d4e6", mid: "#d9e8f2", bottom: "#f7fbff", glow: "rgba(255,255,255,0.16)", mask: "#d9e8f2" },
    "snowy-night": { top: "#35435d", mid: "#55617a", bottom: "#8390a8", glow: "rgba(255,255,255,0.07)", mask: "#55617a" },
    "snowy-sunrise": { top: "#d6dce8", mid: "#e5eaf1", bottom: "#f7f9fc", glow: "rgba(255,255,255,0.12)", mask: "#e5eaf1" },
    "snowy-sunset": { top: "#a89aa8", mid: "#c4b8c4", bottom: "#e3dbe3", glow: "rgba(255,255,255,0.09)", mask: "#c4b8c4" },

    "foggy-day": { top: "#cbd9df", mid: "#dde8eb", bottom: "#eef4f6", glow: "rgba(255,255,255,0.10)", mask: "#dde8eb" },
    "foggy-night": { top: "#49525d", mid: "#67707a", bottom: "#89919c", glow: "rgba(255,255,255,0.05)", mask: "#67707a" },

    "misty-day": { top: "#cfdfe6", mid: "#dfecef", bottom: "#f0f7f9", glow: "rgba(255,255,255,0.10)", mask: "#dfecef" },
    "misty-night": { top: "#687383", mid: "#7c8796", bottom: "#9aa5b3", glow: "rgba(255,255,255,0.05)", mask: "#687383" },

    "warm-day": { top: "#82d9f5", mid: "#b6efff", bottom: "#fff5dc", glow: "rgba(255,220,140,0.12)", mask: "#b6efff" },
    "warm-sunset": { top: "#f39b72", mid: "#f6c28f", bottom: "#ffe1b3", glow: "rgba(255,180,120,0.16)", mask: "#f6c28f" },
    "warm-night": { top: "#0f1730", mid: "#1a2444", bottom: "#2d3b63", glow: "rgba(255,170,110,0.025)",mask: "#1a2444" },

    "cold-day": { top: "#a8d0ee", mid: "#d0e8f8", bottom: "#eef8ff", glow: "rgba(255,255,255,0.14)", mask: "#d0e8f8" },
    "cold-night": { top: "#1c2c46", mid: "#30496c", bottom: "#5d789c", glow: "rgba(255,255,255,0.05)", mask: "#30496c" },

    "windy-day": { top: "#8acfe4", mid: "#b4e1ec", bottom: "#e8f7fb", glow: "rgba(255,255,255,0.10)", mask: "#b4e1ec" },
    "windy-night": { top: "#18263d", mid: "#2d425f", bottom: "#4e6688", glow: "rgba(255,255,255,0.04)", mask: "#2d425f" },

    "sleety-day": { top: "#617f99", mid: "#7c9ab0", bottom: "#b0c6d4", glow: "rgba(255,255,255,0.04)", mask: "#7c9ab0" },
    "sleety-night": { top: "#151b28", mid: "#232c3d", bottom: "#3b4659", glow: "rgba(80,98,120,0.04)", mask: "#232c3d" },
    "sleety-sunrise": { top: "#76808a", mid: "#9caab1", bottom: "#c7d0d5", glow: "rgba(255,255,255,0.04)", mask: "#9caab1" },
    "sleety-sunset": { top: "#65646d", mid: "#8e8d96", bottom: "#b7b7bf", glow: "rgba(255,255,255,0.03)", mask: "#8e8d96" }
  };

  return palettes[key] || palettes[`${weatherState}-day`] || palettes["clear-day"];
}

function applySkyPalette(data) {
  if (!backgroundScene) return;

  const { timeState, weatherState } = getSceneState(data);
  const palette = getSkyPalette(weatherState, timeState);

  backgroundScene.style.setProperty("--sky-top", palette.top);
  backgroundScene.style.setProperty("--sky-mid", palette.mid);
  backgroundScene.style.setProperty("--sky-bottom", palette.bottom);
  backgroundScene.style.setProperty("--sky-glow", palette.glow);
  backgroundScene.style.setProperty("--sky-mask-color", palette.mask);
  console.log("PALETTE STATE:", { weatherState, timeState, palette });
}
/* --------------------------
   SCENE RESOLUTION
-------------------------- */

function fallbackResolveTimeState(data) {
  const now = getDateOrNull(data.time);
  const sunrise = getDateOrNull(data.sunrise);
  const sunset = getDateOrNull(data.sunset);

  if (!now) return data.isDay === 1 ? "day" : "night";

  if (sunrise && sunset) {
    const sunriseStart = new Date(sunrise.getTime() - 45 * 60 * 1000);
    const sunriseEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);
    const sunsetStart = new Date(sunset.getTime() - 60 * 60 * 1000);
    const sunsetEnd = new Date(sunset.getTime() + 45 * 60 * 1000);

    if (now >= sunriseStart && now <= sunriseEnd) return "sunrise";
    if (now >= sunsetStart && now <= sunsetEnd) return "sunset";
    if (now > sunriseEnd && now < sunsetStart) return "day";
    return "night";
  }

  return data.isDay === 1 ? "day" : "night";
}

function fallbackResolveWeatherState(data) {
  const rain = Number(data.rain ?? data.precipitation ?? 0);
  const snow = Number(data.snowfall ?? 0);
  const cloudCover = Number(data.cloudCover ?? 0);
  const visibility = Number(data.visibility ?? 10000);
  const humidity = Number(data.humidity ?? 0);
  const wind = Number(data.windSpeed ?? 0);
  const code = Number(data.weatherCode ?? -1);

  if ([95, 96, 99].includes(code) || rain >= 4) return "stormy";
  if ([71, 73, 75, 77, 85, 86].includes(code) || snow > 0.15) return "snowy";
  if ([56, 57, 66, 67].includes(code)) return "sleety";
  if (code === 45 || code === 48 || (visibility < 1000 && humidity > 90)) return "foggy";
  if (visibility < 3000 && humidity > 80) return "misty";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) || rain > 0.2) return "rainy";
  if (cloudCover > 60) return "cloudy";
  if (wind >= 9) return "windy";

  return "clear";
}

function fallbackResolveTempState(data) {
  const temp = Number(data.apparentTemperature ?? data.airTemperature);

  if (Number.isNaN(temp)) return "mild";
  if (temp <= 0) return "freezing";
  if (temp <= 10) return "cold";
  if (temp < 22) return "mild";
  if (temp < 30) return "warm";
  return "hot";
}

function fallbackResolveSeasonState(data) {
  const date = getDateOrNull(data.time) || new Date();
  const month = date.getUTCMonth() + 1;
  const lat = Number(data.lat ?? 0);
  const isNorthernHemisphere = lat >= 0;

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

function getSceneState(data = {}) {
  const scene = data.scene || {};

return {
  timeState: scene.timeState || fallbackResolveTimeState(data),
  weatherState: scene.weatherState || fallbackResolveWeatherState(data),
  tempState: scene.tempState || fallbackResolveTempState(data),
  seasonState: scene.seasonState || fallbackResolveSeasonState(data),
  holidayState: scene.holidayState || "none",
  skyEvent: scene.skyEvent || "none",
  overrideSkyEvent: Boolean(scene.overrideSkyEvent),
  forceInvalidSkyEvent: Boolean(scene.forceInvalidSkyEvent),
  showStars: scene.showStars !== false,
  showSunMoon: scene.showSunMoon !== false,
  forceRainbow: Boolean(scene.forceRainbow),
  forceAurora: Boolean(scene.forceAurora)
};
}

function normalizeSeasonKey(seasonValue) {
  const season = String(seasonValue || "").toLowerCase().trim();

  if (season === "autumn") return "fall";
  if (["spring", "summer", "fall", "winter"].includes(season)) return season;

  return "summer";
}

function applySeasonScenery(data) {
  const sceneryImg = document.getElementById("seasonSceneryImg");
  if (!sceneryImg) return;

  const sceneState = getSceneState(data);
  const season = normalizeSeasonKey(sceneState.seasonState);

  const sceneryMap = {
    spring: "/images/backgrounds/spring.png",
    summer: "/images/backgrounds/summer.png",
    fall: "/images/backgrounds/fall.png",
    winter: "/images/backgrounds/winter.png"
  };

  sceneryImg.src = sceneryMap[season] || sceneryMap.spring;
}

function clearSceneClasses() {
  body.classList.remove(
    "weather-default",
    "time-sunrise",
    "time-day",
    "time-sunset",
    "time-night",
    "weather-clear",
    "weather-cloudy",
    "weather-rainy",
    "weather-stormy",
    "weather-snowy",
    "weather-sleety",
    "weather-foggy",
    "weather-misty",
    "weather-windy",
    "temp-freezing",
    "temp-cold",
    "temp-mild",
    "temp-warm",
    "temp-hot",
    "season-spring",
    "season-summer",
    "season-autumn",
    "season-winter",
    "holiday-none",
    "holiday-christmas",
    "holiday-halloween",
    "holiday-valentines",
    "holiday-easter",
    "holiday-newyear",
    "text-light",
    "text-dark",
    "is-night",
    "is-sunrise",
    "is-sunset",
    "is-day",
    "foggy",
    "misty",
    "is-heatwave",
    "show-aurora",
    "show-rainbow",
    "lightning-flash"
  );
}

function resolveTextTheme(sceneState) {
  const { timeState, weatherState } = sceneState;

  if (timeState === "night") return "text-light";
  if (timeState === "sunset" && ["stormy", "rainy", "foggy", "misty", "snowy"].includes(weatherState)) {
    return "text-light";
  }
  if (["stormy", "foggy"].includes(weatherState)) return "text-light";

  return "text-dark";
}

function applySceneClasses(data) {
  clearSceneClasses();

  const sceneState = getSceneState(data);
  const { timeState, weatherState, tempState, seasonState, holidayState } = sceneState;

  body.classList.add(`time-${timeState}`);
  body.classList.add(`weather-${weatherState}`);
  body.classList.add(`temp-${tempState}`);
  body.classList.add(`season-${seasonState}`);
  body.classList.add(`holiday-${holidayState}`);
  body.classList.add(resolveTextTheme(sceneState));

  if (timeState === "night") body.classList.add("is-night");
  else if (timeState === "sunrise") body.classList.add("is-sunrise");
  else if (timeState === "sunset") body.classList.add("is-sunset");
  else body.classList.add("is-day");
}

function isCurrentlyDaytime(data) {
  const { timeState } = getSceneState(data);
  return ["sunrise", "day", "sunset"].includes(timeState);
}

function getDayNightLabel(data) {
  const { timeState } = getSceneState(data);

  if (timeState === "night") return "Night";
  if (timeState === "sunrise") return "Sunrise";
  if (timeState === "sunset") return "Sunset";
  return "Day";
}

/* --------------------------
   SPECIAL SKY EFFECTS
-------------------------- */

function updateHeatwave(data) {
  body.classList.remove("is-heatwave");

  const temp = Number(data.airTemperature ?? 0);
  const feels = Number(data.apparentTemperature ?? 0);
  const uv = Number(data.uvIndex ?? 0);
  const { timeState } = getSceneState(data);

  if (timeState !== "night" && (temp >= 30 || feels >= 32 || uv >= 7)) {
    body.classList.add("is-heatwave");
  }
}

function updateAurora(data) {
  body.classList.remove("show-aurora");

  if (!auroraLayer) return;
  auroraLayer.innerHTML = "";

  const sceneState = getSceneState(data);
  const shouldShowAurora = sceneState.forceAurora === true;

  if (!shouldShowAurora) return;

  body.classList.add("show-aurora");
  auroraLayer.innerHTML = `
    <div class="aurora-band aurora-band-1"></div>
    <div class="aurora-band aurora-band-2"></div>
    <div class="aurora-band aurora-band-3"></div>
  `;
}

function updateRainbow(data) {
  body.classList.remove("show-rainbow");

  if (rainbowTimeout) {
    clearTimeout(rainbowTimeout);
    rainbowTimeout = null;
  }

  const sceneState = getSceneState(data);

  if (sceneState.forceRainbow) {
    body.classList.add("show-rainbow");
    return;
  }

  const isDay = isCurrentlyDaytime(data);
  const cloudCover = Number(data.cloudCover ?? 100);
  const { weatherState } = sceneState;

  const hadRecentRain =
    lastRainyData &&
    Date.now() - lastRainyData.timestamp < 20 * 60 * 1000;

  const nowClearish =
    isDay &&
    ["clear", "cloudy"].includes(weatherState) &&
    cloudCover <= 55;

  if (hadRecentRain && nowClearish) {
    body.classList.add("show-rainbow");

    rainbowTimeout = setTimeout(() => {
      body.classList.remove("show-rainbow");
    }, 90000);
  }
}

/* --------------------------
   CLOUDS
-------------------------- */

function updateCloudSpeed(windSpeed = 0) {
  const clouds = document.querySelectorAll(".cloud");
  const actualWind = Number(windSpeed || 0);

  clouds.forEach((cloud, index) => {
    const softenedWind = actualWind * 0.5;
    const baseDuration = 95 + index * 10;
    const reduction = softenedWind * 2.5;
    const duration = clamp(baseDuration - reduction, 38, 130);
    cloud.style.animationDuration = `${duration}s`;
  });
}

function updateCloudAmount(cloudCover = 0, weatherState = "clear") {
  const clouds = [
    document.querySelector(".cloud-a"),
    document.querySelector(".cloud-b"),
    document.querySelector(".cloud-c"),
    document.querySelector(".cloud-d"),
    document.querySelector(".cloud-e"),
    document.querySelector(".cloud-f"),
    document.querySelector(".cloud-g"),
    document.querySelector(".cloud-h"),
    document.querySelector(".cloud-i"),
    document.querySelector(".cloud-j")
  ].filter(Boolean);

  const cover = Number(cloudCover || 0);
  let visibleCount = 0;

  if (weatherState === "stormy") visibleCount = clouds.length;
    else if (weatherState === "rainy" || weatherState === "sleety") visibleCount = Math.min(clouds.length, 8);
    else if (weatherState === "cloudy") visibleCount = Math.min(clouds.length, 9);
    else if (weatherState === "foggy" || weatherState === "misty") visibleCount = Math.min(clouds.length, 7);
    else if (cover >= 90) visibleCount = Math.min(clouds.length, 9);
    else if (cover >= 75) visibleCount = Math.min(clouds.length, 7);
    else if (cover >= 55) visibleCount = Math.min(clouds.length, 5);
    else if (cover >= 35) visibleCount = Math.min(clouds.length, 4);
    else if (cover >= 15) visibleCount = Math.min(clouds.length, 2);
    else if (cover > 5) visibleCount = Math.min(clouds.length, 1);
    else visibleCount = 0;

    clouds.forEach((cloud, index) => {
      cloud.style.display = index < visibleCount ? "block" : "none";
      cloud.classList.toggle("cloud-dark", ["stormy", "rainy", "sleety"].includes(weatherState));
  });
}

/* --------------------------
   PARTICLES + SKY EVENTS
-------------------------- */

function clearParticles() {
  if (rainLayer) rainLayer.innerHTML = "";
  if (snowLayer) snowLayer.innerHTML = "";
  if (starsLayer) starsLayer.innerHTML = "";
}

function clearSkyEvents() {
  if (skyEffectsLayer) skyEffectsLayer.innerHTML = "";
  if (sunOrb) sunOrb.classList.remove("eclipse");
  if (moonOrb) moonOrb.classList.remove("eclipse");

  const source = adminMode ? buildAdminScene() : lastWeatherData;
  if (source) applySkyPalette(source);
}

function createRain(intensity = 0.5, windSpeed = 0, mode = "rain") {
  if (!rainLayer) return;
  rainLayer.innerHTML = "";

  let count;

  if (mode === "storm") {
    count = isMobileView() ? Math.round(22 + intensity * 20) : Math.round(40 + intensity * 48);
  } else if (mode === "sleet") {
    count = isMobileView() ? Math.round(10 + intensity * 10) : Math.round(18 + intensity * 22);
  } else {
    count = isMobileView() ? Math.round(16 + intensity * 18) : Math.round(28 + intensity * 38);
  }

  const drift = clamp(windSpeed * 1.1, 3, 20);

  for (let i = 0; i < count; i++) {
    const drop = document.createElement("span");
    drop.className = "rain-drop";

    const left = Math.random() * 100;
    const delay = Math.random() * 2.2;
    const duration = clamp(0.75 + Math.random() * 0.9 - intensity * 0.12, 0.6, 1.9);
    const height =
      mode === "sleet"
        ? clamp(8 + Math.random() * 10, 8, 18)
        : clamp(12 + Math.random() * 16 + intensity * 8, 12, 32);

    const opacity =
      mode === "sleet"
        ? clamp(0.22 + Math.random() * 0.2, 0.2, 0.45)
        : clamp(0.3 + Math.random() * 0.45, 0.28, 0.9);

    drop.style.left = `${left}%`;
    drop.style.animationDelay = `${delay}s`;
    drop.style.animationDuration = `${duration}s`;
    drop.style.height = `${height}px`;
    drop.style.opacity = opacity.toString();
    drop.style.setProperty("--rain-drift", `${drift}px`);

    if (mode === "sleet") {
      drop.style.width = "1px";
      drop.style.background = "linear-gradient(to bottom, transparent, rgba(210,225,240,0.7))";
    }

    rainLayer.appendChild(drop);
  }
}

function createSnow(intensity = 0.45, mode = "snow") {
  if (!snowLayer) return;
  snowLayer.innerHTML = "";

  let count;

  if (mode === "sleet") {
    count = isMobileView() ? Math.round(8 + intensity * 8) : Math.round(14 + intensity * 12);
  } else {
    count = isMobileView() ? Math.round(18 + intensity * 18) : Math.round(34 + intensity * 30);
  }

  for (let i = 0; i < count; i++) {
    const flake = document.createElement("span");
    flake.className = "snowflake";

    const size = mode === "sleet" ? 2 + Math.random() * 2.5 : 4 + Math.random() * 6;

    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDelay = `${Math.random() * 3}s`;
    flake.style.animationDuration = mode === "sleet" ? `${2.2 + Math.random() * 2.2}s` : `${3.5 + Math.random() * 4}s`;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.opacity = mode === "sleet" ? `${0.35 + Math.random() * 0.25}` : `${0.45 + Math.random() * 0.45}`;

    snowLayer.appendChild(flake);
  }
}

function createStars(cloudCover = 0, isNight = false, visibility = 10000, forceShow = true, weatherState = "clear") {
  if (!starsLayer) return;
  starsLayer.innerHTML = "";

if (!isNight || !forceShow) {
  starsLayer.style.opacity = "0";
  return;
}

if (["snowy", "sleety", "rainy", "stormy"].includes(weatherState)) {
  starsLayer.style.opacity = "0";
  return;
}

if (["foggy", "misty"].includes(weatherState)) {
  starsLayer.style.opacity = "0.15";
}

  const safeCloudCover = clamp(Number(cloudCover || 0), 0, 100);
  const safeVisibility = clamp(Number(visibility || 10000), 100, 10000);

  const cloudBrightness = clamp(1 - safeCloudCover / 100, 0.1, 1);
  const visibilityBrightness = clamp(safeVisibility / 10000, 0.08, 1);
  const brightness = clamp(cloudBrightness * visibilityBrightness, 0.08, 1);

  const countBase = isMobileView() ? 24 : 42;
  const count = Math.round(countBase * (0.6 + brightness));

  starsLayer.style.opacity = String(clamp(0.12 + brightness * 0.95, 0.12, 1));

  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "star";

    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 72}%`;
    star.style.width = `${3 + Math.random() * 2.5}px`;
    star.style.height = star.style.width;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    star.style.opacity = `${clamp(0.45 + brightness * 0.7, 0.3, 1)}`;

    starsLayer.appendChild(star);
  }
}
function isSkyEventAllowed(sceneState, eventType) {
  const isNight = sceneState.timeState === "night";
  const isDayLike = ["day", "sunrise", "sunset"].includes(sceneState.timeState);

  if (eventType === "solar-eclipse") return isDayLike;
  if (eventType === "lunar-eclipse") return isNight;
  if (eventType === "shooting-star") return isNight;
  if (eventType === "comet") return isNight;
  if (eventType === "meteor-shower") return isNight;

  return true;
}

function applySkyEvent(data) {
  clearSkyEvents();
  if (!skyEffectsLayer) return;

  const sceneState = getSceneState(data);
  const eventType = sceneState.skyEvent;

  if (!eventType || eventType === "none") return;
  if (!sceneState.forceInvalidSkyEvent && !isSkyEventAllowed(sceneState, eventType)) return;

  switch (eventType) {
    case "shooting-star":
      createShootingStar();
      break;
    case "comet":
      createComet();
      break;
    case "meteor-shower":
      createMeteorShower();
      break;
    case "lunar-eclipse":
      createLunarEclipse();
      break;
    case "solar-eclipse":
      createSolarEclipse();
      break;
  }
}

function createShootingStar() {
  if (!skyEffectsLayer) return;

  const count = isMobileView() ? 5 : 9;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "shooting-star";
    el.style.left = `${10 + Math.random() * 80}%`;
    el.style.top = `${8 + Math.random() * 45}%`;
    el.style.animationDelay = `${Math.random() * 3}s`;
    el.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    el.style.width = `${5 + Math.random() * 3}px`;
    el.style.height = el.style.width;
    skyEffectsLayer.appendChild(el);
  }
}

function createComet() {
  if (!skyEffectsLayer) return;

  const el = document.createElement("div");
  el.className = "comet";
  el.style.left = "88%";
  el.style.top = "14%";
  skyEffectsLayer.appendChild(el);
}

function createMeteorShower() {
  if (!skyEffectsLayer) return;

  const colors = [
    "rgba(170,120,255,0.9)",
    "rgba(100,180,255,0.9)",
    "rgba(255,110,110,0.9)"
  ];

  const count = isMobileView() ? 10 : 18;

  for (let i = 0; i < count; i++) {
    const meteor = document.createElement("div");
    meteor.className = "meteor";
    meteor.style.left = `${55 + Math.random() * 40}%`;
    meteor.style.top = `${5 + Math.random() * 35}%`;
    meteor.style.animationDelay = `${Math.random() * 2.5}s`;
    meteor.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;

    const color = colors[Math.floor(Math.random() * colors.length)];
    meteor.style.setProperty("--meteor-color", color);

    const rock = document.createElement("span");
    rock.className = "meteor-rock";
    rock.style.animationDelay = `${Math.random() * 1.5}s`;
    meteor.appendChild(rock);

    skyEffectsLayer.appendChild(meteor);
  }
}

function createLunarEclipse() {
  if (!moonOrb) return;

  if (skyEffectsLayer) skyEffectsLayer.innerHTML = "";
  if (sunOrb) {
    sunOrb.style.opacity = "0";
    sunOrb.style.visibility = "hidden";
    sunOrb.classList.remove("eclipse");
  }

  moonOrb.classList.remove("eclipse");
  moonOrb.classList.add("eclipse");

  if (backgroundScene) {
    backgroundScene.style.setProperty("--sky-top", "#2a1020");
    backgroundScene.style.setProperty("--sky-mid", "#4a1f30");
    backgroundScene.style.setProperty("--sky-bottom", "#2b2945");
    backgroundScene.style.setProperty("--sky-glow", "rgba(180,60,60,0.10)");
  }
}

function createSolarEclipse() {
  if (!sunOrb) return;

  const source = adminMode ? buildAdminScene() : (lastWeatherData || {});
  const sceneState = getSceneState(source);

  if (sceneState.timeState === "night" && !sceneState.forceInvalidSkyEvent) {
    return;
  }

  if (skyEffectsLayer) skyEffectsLayer.innerHTML = "";
  if (moonOrb) {
    moonOrb.style.opacity = "0";
    moonOrb.style.visibility = "hidden";
    moonOrb.classList.remove("eclipse");
  }

  sunOrb.classList.remove("eclipse");
  sunOrb.classList.add("eclipse");

  if (backgroundScene) {
    backgroundScene.style.setProperty("--sky-top", "#7c6830");
    backgroundScene.style.setProperty("--sky-mid", "#9b8340");
    backgroundScene.style.setProperty("--sky-bottom", "#5f5330");
    backgroundScene.style.setProperty("--sky-glow", "rgba(255,230,140,0.08)");
  }
}

/* --------------------------
   LIGHTNING
-------------------------- */

function stopLightning() {
  if (lightningTimeout) {
    clearTimeout(lightningTimeout);
    lightningTimeout = null;
  }
  body.classList.remove("lightning-flash");
}

function scheduleLightning() {
  stopLightning();

  if (
    getSceneState(lastWeatherData || {}).weatherState !== "stormy" &&
    !body.classList.contains("weather-stormy")
  ) {
    return;
  }

  const flash = () => {
    body.classList.add("lightning-flash");

    setTimeout(() => {
      body.classList.remove("lightning-flash");

      if (Math.random() > 0.55) {
        setTimeout(() => {
          body.classList.add("lightning-flash");
          setTimeout(() => body.classList.remove("lightning-flash"), 90);
        }, 120);
      }
    }, 120);

    const nextDelay = 2500 + Math.random() * 6000;
    lightningTimeout = setTimeout(flash, nextDelay);
  };

  lightningTimeout = setTimeout(flash, 2000 + Math.random() * 3000);
}

/* --------------------------
   FOG / MIST
-------------------------- */

function updateFog(data) {
  if (!fogLayer) return;

  const { weatherState } = getSceneState(data);

  body.classList.remove("foggy", "misty");
  fogLayer.style.opacity = "0";

  if (weatherState === "foggy") {
    body.classList.add("foggy");
    fogLayer.style.opacity = "1";
    return;
  }

  if (weatherState === "misty") {
    body.classList.add("misty");
    fogLayer.style.opacity = "0.7";
  }
}

/* --------------------------
   SUN / MOON ARC + PHASE
-------------------------- */

function hideSkyBodies() {
  if (sunOrb) {
    sunOrb.style.opacity = "0";
    sunOrb.style.visibility = "hidden";
  }
  if (moonOrb) {
    moonOrb.style.opacity = "0";
    moonOrb.style.visibility = "hidden";
  }
}

function positionArcOrb(orb, progress) {
  const arcWrap = document.querySelector(".sky-arc-wrap");
  if (!arcWrap || !orb) return;

  const width = arcWrap.offsetWidth;
  const height = arcWrap.offsetHeight;
  const safeProgress = clamp(progress, 0, 1);

  const sidePadding = width * 0.1;
  const usableWidth = width - sidePadding * 2;
  const x = sidePadding + safeProgress * usableWidth;

  const curve = Math.sin(safeProgress * Math.PI);

  // keep the sides lifted, but lower the whole orbit a little
  const minimumLift = height * 0.26;
  const arcLift = Math.pow(curve, 0.9) * (height * 0.38);
  const totalLift = minimumLift + arcLift;

  orb.style.left = `${x}px`;
  orb.style.top = `${height - totalLift}px`;
  orb.style.opacity = "1";
  orb.style.visibility = "visible";
}

function normalizeMoonPhase(phaseValue) {
  const p = String(phaseValue || "").toLowerCase().trim();

  if (p.includes("new")) return "new";
  if (p.includes("young")) return "young";
  if (p.includes("old")) return "old";

  if (p.includes("waxing") && p.includes("crescent")) return "waxing-crescent";
  if (p.includes("first")) return "first-quarter";
  if (p.includes("quarter")) return p.includes("last") ? "last-quarter" : "first-quarter";
  if (p.includes("waxing") && p.includes("gibbous")) return "waxing-gibbous";
  if (p.includes("full")) return "full";
  if (p.includes("waning") && p.includes("gibbous")) return "waning-gibbous";
  if (p.includes("last")) return "last-quarter";
  if (p.includes("waning") && p.includes("crescent")) return "waning-crescent";

  if (p === "crescent") return "waxing-crescent";
  if (p === "half") return "first-quarter";
  if (p === "gibbous") return "waxing-gibbous";

  return "full";
}

function inferMoonPhaseFromDate(dateValue) {
  const date = getDateOrNull(dateValue) || new Date();
  const lunarMonth = 29.53058867;
  const knownNewMoon = new Date("2024-01-11T11:57:00Z");
  const days = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = ((days % lunarMonth) + lunarMonth) % lunarMonth;
  const fraction = phase / lunarMonth;

  if (fraction < 0.03 || fraction > 0.97) return "new";
  if (fraction < 0.22) return "waxing-crescent";
  if (fraction < 0.28) return "first-quarter";
  if (fraction < 0.47) return "waxing-gibbous";
  if (fraction < 0.53) return "full";
  if (fraction < 0.72) return "waning-gibbous";
  if (fraction < 0.78) return "last-quarter";
  return "waning-crescent";
}

function applyMoonPhase(phase = "full") {
  const img = document.getElementById("moonPhaseImg");
  if (!img) return;

  const normalized = normalizeMoonPhase(phase);

  const map = {
    "new": "new.png",
    "young": "young.png",
    "waxing-crescent": "waxing-crescent.png",
    "first-quarter": "first-quarter.png",
    "waxing-gibbous": "waxing-gibbous.png",
    "full": "full.png",
    "waning-gibbous": "waning-gibbous.png",
    "last-quarter": "last-quarter.png",
    "waning-crescent": "waning-crescent.png",
    "old": "old.png"
  };

  img.src = `/images/moon/${map[normalized] || "full.png"}`;
}

function updateSunMoon(data) {
  const sunrise = getDateOrNull(data.sunrise);
  const sunset = getDateOrNull(data.sunset);
  const now = getDateOrNull(data.time) || new Date();
  const sceneState = getSceneState(data);
  const { timeState, weatherState, showSunMoon } = sceneState;

  if (sunOrb) {
    sunOrb.style.display = "none";
    sunOrb.style.opacity = "0";
    sunOrb.style.visibility = "hidden";
    sunOrb.classList.remove("eclipse");
  }

  if (moonOrb) {
    moonOrb.style.display = "none";
    moonOrb.style.opacity = "0";
    moonOrb.style.visibility = "hidden";
    moonOrb.classList.remove("eclipse");
  }

  if (!showSunMoon) return;
  if (!sunrise || !sunset) return;

  const heavySky = ["rainy", "stormy", "foggy", "misty"].includes(weatherState);
  const hideSunCompletely = ["rainy", "stormy"].includes(weatherState);

  if (timeState === "day" || timeState === "sunrise" || timeState === "sunset") {
    const progress = clamp((now - sunrise) / (sunset - sunrise), 0, 1);

    if (sunOrb) {
      sunOrb.style.display = "block";
      positionArcOrb(sunOrb, progress);
      sunOrb.style.visibility = "visible";

      if (hideSunCompletely) sunOrb.style.opacity = "0";
      else if (heavySky) sunOrb.style.opacity = "0.18";
      else sunOrb.style.opacity = "1";
    }

    return;
  }

  if (timeState === "night") {
    const moonStart = sunset;
    const moonEnd = addHours(moonStart, 12);

    if (moonOrb) {
      moonOrb.style.display = "block";
      applyMoonPhase(data.moonPhase || inferMoonPhaseFromDate(data.time));

      if (now >= moonStart && now <= moonEnd) {
        const progress = clamp((now - moonStart) / (moonEnd - moonStart), 0, 1);
        positionArcOrb(moonOrb, progress);
      } else {
        positionArcOrb(moonOrb, 0.5);
      }

      moonOrb.style.visibility = "visible";
      moonOrb.style.opacity = heavySky ? "0.2" : "1";
    }
  }
}

/* --------------------------
   BACKGROUND
-------------------------- */

function updateBackgroundEffects(data) {
  clearParticles();
  clearSkyEvents();

  const sceneState = getSceneState(data);
  const { weatherState, timeState, tempState, showStars } = sceneState;

  applySceneClasses(data);
  applySkyPalette(data);
  applySeasonScenery(data);
  updateHeatwave(data);
  updateAurora(data);
  updateRainbow(data);

  const precipitation = Number(data.precipitation ?? 0);
  const snowfall = Number(data.snowfall ?? 0);
  const cloudCover = Number(data.cloudCover ?? 0);
  const windSpeed = Number(data.windSpeed ?? 0);
  const visibility = Number(data.visibility ?? 10000);
  const isNight = timeState === "night";

  updateCloudSpeed(windSpeed);
  updateCloudAmount(cloudCover, weatherState);

  if (weatherState === "rainy") {
    createRain(clamp(Math.max(precipitation, 0.6) / 5, 0.28, 0.75), windSpeed, "rain");
  }

  if (weatherState === "stormy") {
    createRain(clamp(Math.max(precipitation, 1.2) / 5, 0.45, 1), windSpeed, "storm");
  }

  if (weatherState === "sleety") {
    createRain(clamp(Math.max(precipitation, 0.25) / 5, 0.18, 0.45), windSpeed, "sleet");
    createSnow(clamp(0.25 + snowfall * 1.2, 0.18, 0.42), "sleet");
  }

  if (weatherState === "snowy") {
    createSnow(clamp(0.55 + snowfall * 2, 0.55, 1), "snow");
  }

  createStars(cloudCover, isNight, visibility, showStars, weatherState);
  updateFog(data);
  updateSunMoon(data);
  applySkyEvent(data);

  if (weatherState === "stormy") {
    scheduleLightning();
  } else {
    stopLightning();
  }

  if (["warm", "hot"].includes(tempState)) {
    body.classList.add("is-heatwave");
  } else {
    body.classList.remove("is-heatwave");
  }
}

function buildSummary(temp, wind, city, weatherState, isDay) {
  const safeCity = city || "this location";

  if (weatherState === "foggy") return `It’s foggy in ${safeCity}.`;
  if (weatherState === "misty") return `It’s misty in ${safeCity}.`;
  if (weatherState === "rainy") return `It’s rainy in ${safeCity}.`;
  if (weatherState === "stormy") return `It’s stormy in ${safeCity}.`;
  if (weatherState === "snowy") return `It’s snowy in ${safeCity}.`;
  if (weatherState === "sleety") return `It’s sleety in ${safeCity}.`;
  if (weatherState === "cloudy") {
    return isDay
      ? `It’s cloudy in ${safeCity}.`
      : `It’s a cloudy night in ${safeCity}.`;
  }
  if (weatherState === "windy") return `It’s windy in ${safeCity}.`;

  if (temp == null) return `Weather data for ${safeCity}.`;
  if (temp < 5) return `It’s cold in ${safeCity}.`;
  if (temp < 12) return `It’s cool in ${safeCity}.`;
  if (temp < 20) return `It’s pleasant in ${safeCity}.`;
  if (temp < 26) return `It’s warm in ${safeCity}.`;

  return `It’s hot in ${safeCity}.`;
}

/* --------------------------
   RECENT SEARCHES
-------------------------- */

function saveRecentSearch(city) {
  if (!city) return;

  let searches = JSON.parse(localStorage.getItem("recentWeatherSearches")) || [];
  searches = searches.filter((item) => item.toLowerCase() !== city.toLowerCase());
  searches.unshift(city);

  if (searches.length > 5) {
    searches = searches.slice(0, 5);
  }

  localStorage.setItem("recentWeatherSearches", JSON.stringify(searches));
  renderRecentSearches();
}

function renderRecentSearches() {
  if (!recentSearchesContainer) return;

  const searches = JSON.parse(localStorage.getItem("recentWeatherSearches")) || [];

  if (searches.length === 0) {
    recentSearchesContainer.innerHTML = "";
    return;
  }

  recentSearchesContainer.innerHTML = `
    <div class="recent-searches-box">
      <p class="recent-title">Recent searches</p>
      <div class="recent-buttons">
        ${searches
          .map((city) => `<button type="button" class="recent-search-btn" data-city="${city}">${city}</button>`)
          .join("")}
      </div>
    </div>
  `;

  document.querySelectorAll(".recent-search-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const city = button.dataset.city;
      cityInput.value = city;
      fetchWeatherByCity(city);
    });
  });
}

/* --------------------------
   WEEKLY FORECAST
-------------------------- */

function renderWeeklyForecastRows(forecast = []) {
  if (!Array.isArray(forecast) || forecast.length === 0) {
    return `
      <div class="weekly-row">
        <span class="weekly-day">No forecast available</span>
      </div>
    `;
  }

  return forecast
    .map((day) => {
      const icon = getForecastIcon(day.weatherState);
      const iconLabel = titleCase(day.weatherState);
      const rainChance = day.rainChance ?? 0;
      const maxTemp = day.maxTemp != null ? `${Math.round(day.maxTemp)}°` : "—";
      const minTemp = day.minTemp != null ? `${Math.round(day.minTemp)}°` : "—";

      return `
        <div class="weekly-row">
          <span class="weekly-day">${day.dayLabel || "Day"}</span>
          <span class="weekly-middle">
            <span class="weekly-icon" title="${iconLabel}">${icon}</span>
            <span class="weekly-rain">${rainChance}%</span>
          </span>
          <span class="weekly-temps">${maxTemp} / ${minTemp}</span>
        </div>
      `;
    })
    .join("");
}

/* --------------------------
   RENDER
-------------------------- */

function renderWeather(data, customTitle = null) {
  const city = data.city || "Location";
  const countryText = data.country ? `, ${data.country}` : "";
  const isDay = isCurrentlyDaytime(data);
  const dayNightLabel = getDayNightLabel(data);
  const sceneState = getSceneState(data);

  const summary = buildSummary(
    data.airTemperature,
    data.windSpeed,
    city,
    sceneState.weatherState,
    isDay
  );

  const titleText = customTitle || `${city}${countryText}`;
  const localTimeText = formatDateTime(data.time, data.timezone);
  const seasonLabel = titleCase(sceneState.seasonState);
  const holidayLabel =
    sceneState.holidayState !== "none"
      ? titleCase(sceneState.holidayState)
      : "";

  const seasonIcon = getSeasonIcon(sceneState.seasonState);
  const holidayIcon = getHolidayIcon(sceneState.holidayState);
  const weatherIcon = getWeatherIcon(sceneState.weatherState);

  const weeklyForecastMarkup = renderWeeklyForecastRows(data.weeklyForecast || []);

  result.innerHTML = `
    <div class="weather-card">
      <div class="weather-city">${titleText}</div>
      <div class="weather-desc">
        ${weatherIcon} ${titleCase(sceneState.weatherState)} • ${seasonIcon} ${seasonLabel}
        ${holidayLabel ? `• ${holidayIcon} ${holidayLabel}` : ""}
      </div>
      <div class="weather-temp">${formatValue(data.airTemperature, "°C")}</div>
      <div class="weather-desc">
        ${summary} • ${localTimeText} • ${dayNightLabel}
      </div>

      <div class="weather-grid">
        <div class="weather-tile">
          <div class="weather-icon">🌡️</div>
          <div class="weather-label">Feels like</div>
          <div class="weather-value">${formatValue(data.apparentTemperature, "°C")}</div>
        </div>

        <div class="weather-tile">
          <div class="weather-icon">💧</div>
          <div class="weather-label">Humidity</div>
          <div class="weather-value">${formatValue(data.humidity, "%")}</div>
        </div>

        <div class="weather-tile">
          <div class="weather-icon">🌬️</div>
          <div class="weather-label">Wind</div>
          <div class="weather-value">${formatValue(data.windSpeed, " km/h")}</div>
        </div>

        <div class="weather-tile">
          <div class="weather-icon">☁️</div>
          <div class="weather-label">Cloud cover</div>
          <div class="weather-value">${formatValue(data.cloudCover, "%")}</div>
        </div>

        <div class="weather-tile">
          <div class="weather-icon">👁️</div>
          <div class="weather-label">Visibility</div>
          <div class="weather-value">${formatValue(data.visibility, " m")}</div>
        </div>

        <div class="weather-tile">
          <div class="weather-icon">☀️</div>
          <div class="weather-label">UV index</div>
          <div class="weather-value">${formatValue(data.uvIndex)}</div>
        </div>
      </div>

      <details class="weekly-weather">
        <summary>7-Day Forecast</summary>
        <div class="weekly-list">
          ${weeklyForecastMarkup}
        </div>
      </details>

      <details class="exact-weather">
        <summary>Exact weather data</summary>
        <div class="weather-grid" style="margin-top:12px;">
          ${renderDetailItem("Temperature", formatValue(data.airTemperature, " °C"))}
          ${renderDetailItem("Feels Like", formatValue(data.apparentTemperature, " °C"))}
          ${renderDetailItem("Humidity", formatValue(data.humidity, "%"))}
          ${renderDetailItem("Visibility", formatValue(data.visibility, " m"))}
          ${renderDetailItem("Condition", titleCase(sceneState.weatherState))}
          ${renderDetailItem("Time State", titleCase(sceneState.timeState))}
          ${renderDetailItem("Season", titleCase(sceneState.seasonState))}
          ${renderDetailItem("Holiday", titleCase(sceneState.holidayState))}
          ${renderDetailItem("Wind Speed", formatValue(data.windSpeed, " km/h"))}
          ${renderDetailItem("Wind Direction", formatValue(data.windDirection, "°"))}
          ${renderDetailItem("Sunrise", formatClock(data.sunrise, data.timezone))}
          ${renderDetailItem("Sunset", formatClock(data.sunset, data.timezone))}
          ${renderDetailItem("Moon Phase", titleCase(normalizeMoonPhase(data.moonPhase || inferMoonPhaseFromDate(data.time))))}
        </div>
      </details>
    </div>
  `;
}

/* --------------------------
   STATES
-------------------------- */

function showLoading(message = "Loading weather...") {
  result.innerHTML = `
    <div class="weather-card">
      <div class="weather-desc">${message}</div>
    </div>
  `;
}

function showError(message) {
  result.innerHTML = `
    <div class="weather-card">
      <div class="weather-desc">${message}</div>
    </div>
  `;
}

/* --------------------------
   FETCH
-------------------------- */

async function fetchWeatherByCity(city) {
  try {
    adminMode = false;
    showLoading(`Searching weather for ${city}...`);

    const response = await fetch(`/city-weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Weather request failed.");
      return;
    }

    if (["rainy", "stormy", "sleety"].includes(getSceneState(data).weatherState)) {
      lastRainyData = {
        timestamp: Date.now(),
        city: data.city
      };
    }

    lastWeatherData = data;
    updateBackgroundEffects(data);
    renderWeather(data);
    saveRecentSearch(data.city || city);
  } catch (error) {
    console.error(error);
    showError("Weather request failed.");
  }
}

async function getLocationWeather() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported in this browser.");
    return;
  }

  adminMode = false;
  showLoading("Getting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const response = await fetch(`/weather?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        if (!response.ok) {
          showError(data.error || "Could not fetch local weather.");
          return;
        }

        if (["rainy", "stormy", "sleety"].includes(getSceneState(data).weatherState)) {
          lastRainyData = {
            timestamp: Date.now(),
            city: data.city
          };
        }

        lastWeatherData = data;
        updateBackgroundEffects(data);
        renderWeather(data);
      } catch (error) {
        console.error(error);
        showError("Could not fetch local weather.");
      }
    },
    () => {
      showError("Unable to get your location.");
    }
  );
}

/* --------------------------
   ADMIN PANEL
-------------------------- */

function setSliderReadouts() {
  if (adminCloudCoverValue) adminCloudCoverValue.textContent = `${adminCloudCover.value}%`;
  if (adminRainValue) adminRainValue.textContent = `${adminRain.value} mm`;
  if (adminVisibilityValue) adminVisibilityValue.textContent = `${adminVisibility.value} m`;
  if (adminHumidityValue) adminHumidityValue.textContent = `${adminHumidity.value}%`;
  if (adminTempValue) adminTempValue.textContent = `${adminTemp.value} °C`;
  if (adminWindValue) adminWindValue.textContent = `${adminWind.value} m/s`;
}

function openAdminPanel() {
  if (adminPanel) adminPanel.classList.remove("hidden");
}

function closeAdminPanel() {
  if (adminPanel) adminPanel.classList.add("hidden");
}

function getAdminTempState(temp) {
  const numericTemp = Number(temp ?? 15);

  if (numericTemp <= 0) return "freezing";
  if (numericTemp <= 10) return "cold";
  if (numericTemp < 22) return "mild";
  if (numericTemp < 30) return "warm";
  return "hot";
}

function buildAdminWeeklyForecast(chosenCondition, chosenTemp) {
  const days = ["Today", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return days.map((dayLabel, index) => ({
    date: new Date(Date.now() + index * 86400000).toISOString(),
    dayLabel,
    weatherCode: 0,
    weatherState: chosenCondition,
    rainChance:
      chosenCondition === "rainy" || chosenCondition === "stormy" || chosenCondition === "sleety"
        ? 60 - index * 4
        : chosenCondition === "cloudy"
        ? 20 + index
        : 5 + index,
    maxTemp: chosenTemp + (index % 3),
    minTemp: chosenTemp - 6 + (index % 2)
  }));
}

function buildAdminScene() {
  const now = new Date();
  const sunriseBase = new Date(now);
  sunriseBase.setHours(6, 30, 0, 0);

  const sunsetBase = new Date(now);
  sunsetBase.setHours(18, 0, 0, 0);

  let fakeTime = new Date(now);

  switch (adminTimeOfDay?.value) {
    case "day":
      fakeTime = new Date(now);
      fakeTime.setHours(12, 0, 0, 0);
      break;
    case "night":
      fakeTime = new Date(now);
      fakeTime.setHours(22, 0, 0, 0);
      break;
    case "sunrise":
      fakeTime = new Date(sunriseBase.getTime() + 20 * 60 * 1000);
      break;
    case "sunset":
      fakeTime = new Date(sunsetBase.getTime() - 20 * 60 * 1000);
      break;
    default:
      fakeTime = new Date(now);
      break;
  }

  const chosenCondition = adminTheme?.value || "clear";
    let resolvedWeatherState = chosenCondition;
    if (chosenCondition === "cold" || chosenCondition === "warm") {
      resolvedWeatherState = "clear";
    }
  const chosenTemp = Number(adminTemp?.value ?? 15);

  let snowfall = 0;
  if (chosenCondition === "snowy") snowfall = 1.5;
  if (chosenCondition === "sleety") snowfall = 0.3;

  return {
    city: "Admin Preview",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lat: "—",
    lng: "—",
    airTemperature: chosenTemp,
    apparentTemperature: chosenTemp,
    windSpeed: Number(adminWind?.value ?? 5),
    windDirection: 180,
    windGusts: Number(adminWind?.value ?? 5) + 4,
    precipitation: Number(adminRain?.value ?? 0),
    rain: Number(adminRain?.value ?? 0),
    showers: 0,
    snowfall,
    cloudCover: Number(adminCloudCover?.value ?? 50),
    cloudCoverLow: Number(adminCloudCover?.value ?? 50),
    cloudCoverMid: Math.max(0, Number(adminCloudCover?.value ?? 50) - 10),
    cloudCoverHigh: Math.max(0, Number(adminCloudCover?.value ?? 50) - 20),
    humidity: Number(adminHumidity?.value ?? 50),
    visibility: Number(adminVisibility?.value ?? 10000),
    sunrise: sunriseBase.toISOString(),
    sunset: sunsetBase.toISOString(),
    daylightDuration: 41400,
    sunshineDuration: 21000,
    uvIndex: 4,
    uvIndexMax: 6,
    uvIndexClearSkyMax: 7,
    seaLevelPressure: 1013,
    surfacePressure: 1008,
    time: fakeTime.toISOString(),
    weatherCode: 0,
    isDay: adminTimeOfDay?.value === "night" ? 0 : 1,
    moonPhase: adminMoonPhase?.value || "full",
    weeklyForecast: buildAdminWeeklyForecast(chosenCondition, chosenTemp),
    scene: {
      timeState: adminTimeOfDay?.value || "day",
      weatherState: resolvedWeatherState,
      tempState: getAdminTempState(chosenTemp),
      seasonState: "spring",
      holidayState: "none",
      skyEvent: adminOverrideSkyEvent?.checked ? (adminSkyEvent?.value || "none") : "none",
      overrideSkyEvent: Boolean(adminOverrideSkyEvent?.checked),
      forceInvalidSkyEvent: Boolean(adminForceInvalidSkyEvent?.checked),
      showStars: Boolean(adminShowStars?.checked),
      showSunMoon: Boolean(adminShowSunMoon?.checked),
      forceRainbow: Boolean(adminShowRainbow?.checked),
      forceAurora: Boolean(adminForceAurora?.checked)
    }
  };
}

function applyAdminScene() {
  adminMode = true;

  const scene = buildAdminScene();

  renderWeather(scene, "Admin Preview");

  try {
    updateBackgroundEffects(scene);
  } catch (error) {
    console.error("Admin preview background error:", error);
  }
}

function resetToLiveData() {
  adminMode = false;

  clearSceneClasses();
  clearParticles();
  clearSkyEvents();

  if (starsLayer) starsLayer.style.opacity = "0";
  hideSkyBodies();
  stopLightning();

  if (lastWeatherData) {
    updateBackgroundEffects(lastWeatherData);
    renderWeather(lastWeatherData);
  } else {
    body.classList.add("weather-default");
    result.innerHTML = "";
  }
}

/* --------------------------
   EVENTS
-------------------------- */

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = cityInput?.value.trim();
    if (city) fetchWeatherByCity(city);
  });
}

if (locationBtn) {
  locationBtn.addEventListener("click", getLocationWeather);
}

window.addEventListener("resize", () => {
  if (adminMode) {
    applyAdminScene();
    return;
  }

  if (lastWeatherData) {
    updateBackgroundEffects(lastWeatherData);
  }
});

[
  adminCloudCover,
  adminRain,
  adminVisibility,
  adminHumidity,
  adminTemp,
  adminWind
].forEach((input) => {
  if (input) input.addEventListener("input", setSliderReadouts);
});

if (adminToggle) {
  adminToggle.addEventListener("click", openAdminPanel);
}

if (adminClose) {
  adminClose.addEventListener("click", closeAdminPanel);
}

if (adminApply) {
  adminApply.addEventListener("click", () => {
    applyAdminScene();
    closeAdminPanel();
  });
}

if (adminReset) {
  adminReset.addEventListener("click", () => {
    resetToLiveData();
    closeAdminPanel();
  });
}

/* --------------------------
   START
-------------------------- */

body.classList.add("weather-default");
setSliderReadouts();
if (starsLayer) starsLayer.style.opacity = "0";
renderRecentSearches();
hideSkyBodies();
applySkyPalette({
  scene: { timeState: "night", weatherState: "clear" }
});
applyMoonPhase("full");
clearSkyEvents();
stopLightning();