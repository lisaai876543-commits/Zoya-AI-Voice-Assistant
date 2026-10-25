import { WeatherData } from "../types";

export function getWeatherDescription(code: number): string {
  switch (code) {
    case 0: return "Clear sky ☀️";
    case 1: return "Mainly clear 🌤️";
    case 2: return "Partly cloudy ⛅";
    case 3: return "Overcast ☁️";
    case 45: case 48: return "Foggy 🌫️";
    case 51: case 53: case 55: return "Drizzle 🌦️";
    case 61: case 63: case 65: return "Rain 🌧️";
    case 71: case 73: case 75: return "Snow ❄️";
    case 80: case 81: case 82: return "Rain showers 🌧️";
    case 95: case 96: case 99: return "Thunderstorm ⛈️";
    default: return "Partly cloudy ⛅";
  }
}

export async function fetchWeatherForCity(cityName: string): Promise<WeatherData> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) {
    throw new Error(`Could not search location for "${cityName}".`);
  }
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Location "${cityName}" not found.`);
  }

  const { latitude, longitude, name, country } = geoData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const weatherRes = await fetch(weatherUrl);
  if (!weatherRes.ok) {
    throw new Error(`Could not fetch forecast for "${name}".`);
  }
  const weatherData = await weatherRes.json();
  const current = weatherData.current;

  return {
    city: country ? `${name}, ${country}` : name,
    temperature: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    windSpeed: Math.round(current.wind_speed_10m),
    description: getWeatherDescription(current.weather_code),
    weatherCode: current.weather_code,
    time: current.time || new Date().toLocaleTimeString(),
  };
}

export function validateWhatsAppNumber(number: string): boolean {
  const cleaned = number.replace(/[\s\-\(\)]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export function formatExternalActionUrl(action: "youtube" | "spotify" | "whatsapp" | "open", query: string, target?: string): { url: string; note: string } {
  if (action === "youtube") {
    return {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      note: "Opens YouTube search results in browser.",
    };
  }
  if (action === "spotify") {
    return {
      url: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
      note: "Opens Spotify web player search.",
    };
  }
  if (action === "whatsapp") {
    const cleanNumber = (target || "").replace(/[\s\-\(\)]/g, "");
    return {
      url: `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(query)}`,
      note: "Opens WhatsApp Web with your prefilled message. You review and send it.",
    };
  }
  // Open website
  let cleanUrl = query.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }
  return {
    url: cleanUrl,
    note: "Opens external website in a new tab.",
  };
}
