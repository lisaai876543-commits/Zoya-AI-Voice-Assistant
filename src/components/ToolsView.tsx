import React, { useState, useEffect } from "react";
import { Wrench, Youtube, Music, MessageCircle, Globe, CloudSun, ExternalLink, Loader2, Search, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { fetchWeatherForCity, formatExternalActionUrl, validateWhatsAppNumber } from "../services/toolsService";
import { WeatherData } from "../types";
import { getActiveTheme, subscribeThemeChange, ZoyaTheme } from "../utils/themeManager";
import { dispatchTaskEnergy } from "../services/taskAnimationService";

interface ToolsViewProps {
  onTriggerUrl: (url: string, note?: string) => void;
}

export default function ToolsView({ onTriggerUrl }: ToolsViewProps) {
  // YouTube state
  const [ytQuery, setYtQuery] = useState("");
  // Spotify state
  const [spotifyQuery, setSpotifyQuery] = useState("");
  // WhatsApp state
  const [waNumber, setWaNumber] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waError, setWaError] = useState("");
  // Web URL state
  const [webQuery, setWebQuery] = useState("");
  // Weather state
  const [weatherCity, setWeatherCity] = useState("Lahore");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [theme, setTheme] = useState<ZoyaTheme>(() => getActiveTheme());

  useEffect(() => {
    return subscribeThemeChange((newTheme) => setTheme(newTheme));
  }, []);

  const handleYouTube = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytQuery.trim()) return;
    dispatchTaskEnergy(
      "task-target-tools-yt",
      "YouTube Search",
      `Searching "${ytQuery.trim()}"`,
      "external",
      3000
    );
    const { url, note } = formatExternalActionUrl("youtube", ytQuery.trim());
    onTriggerUrl(url, note);
  };

  const handleSpotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifyQuery.trim()) return;
    dispatchTaskEnergy(
      "task-target-tools-spotify",
      "Spotify Search",
      `Searching "${spotifyQuery.trim()}"`,
      "external",
      3000
    );
    const { url, note } = formatExternalActionUrl("spotify", spotifyQuery.trim());
    onTriggerUrl(url, note);
  };

  const handleWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setWaError("");
    if (!waNumber.trim()) {
      setWaError("Please enter a valid phone number (e.g. +923001234567 or +919876543210).");
      return;
    }
    if (!validateWhatsAppNumber(waNumber.trim())) {
      setWaError("Invalid phone number format. Include country code with 7-15 digits.");
      return;
    }
    if (!waMessage.trim()) {
      setWaError("Please enter your message to prefill in WhatsApp.");
      return;
    }

    dispatchTaskEnergy(
      "task-target-tools-wa",
      "WhatsApp Draft",
      `Drafting for ${waNumber.trim()}`,
      "external",
      3000
    );

    const { url, note } = formatExternalActionUrl("whatsapp", waMessage.trim(), waNumber.trim());
    onTriggerUrl(url, note);
  };

  const handleWeb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webQuery.trim()) return;
    dispatchTaskEnergy(
      "task-target-tools-web",
      "Web Navigation",
      `Opening ${webQuery.trim()}`,
      "external",
      3000
    );
    const { url, note } = formatExternalActionUrl("open", webQuery.trim());
    onTriggerUrl(url, note);
  };

  const weatherReqIdRef = React.useRef(0);

  const handleFetchWeather = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!weatherCity.trim()) return;
    const thisReqId = ++weatherReqIdRef.current;
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const data = await fetchWeatherForCity(weatherCity.trim());
      if (thisReqId === weatherReqIdRef.current) {
        setWeatherData(data);
      }
    } catch (err: any) {
      if (thisReqId === weatherReqIdRef.current) {
        setWeatherError(err.message || "Could not retrieve weather.");
      }
    } finally {
      if (thisReqId === weatherReqIdRef.current) {
        setWeatherLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full overflow-hidden bg-[#0A0C10] relative">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 sm:px-6 border-b border-white/10 bg-[#141620] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Wrench size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
              Assistant Tools & Browser Actions
            </h2>
            <p className="text-[11px] text-white/50">
              Verified external integrations and live web utilities
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Scroll */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
        {/* Safety & Real Platform Reality Banner */}
        <div className="bg-[#141620] border border-white/10 rounded-2xl p-3.5 flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-white/70 leading-relaxed">
            <strong className="text-white block font-medium">Safe Browser Execution</strong>
            Actions open verified external web applications in new tabs. For WhatsApp, the chat opens with your prefilled message so you can review before sending.
          </div>
        </div>

        {/* Live Weather Card (Open-Meteo Integration) */}
        <div id="task-target-tools-weather" className="bg-[#141620] border border-white/10 rounded-2xl p-4 space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <CloudSun size={17} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-white">Live Weather (Real Open-Meteo API)</h3>
                <p className="text-[10px] text-white/40">Real-time global weather conditions</p>
              </div>
            </div>
            {weatherData && (
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Updated
              </span>
            )}
          </div>

          <form onSubmit={handleFetchWeather} className="flex gap-2">
            <input
              type="text"
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              placeholder="Enter city (e.g., Lahore, London, Delhi, New York)"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={weatherLoading || !weatherCity.trim()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              {weatherLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              <span>Check</span>
            </button>
          </form>

          {weatherError && (
            <div className="text-xs text-red-400 flex items-center gap-1.5 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              <AlertCircle size={14} />
              <span>{weatherError}</span>
            </div>
          )}

          {weatherData && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{weatherData.city}</div>
                <div className="text-xs text-amber-300 font-medium mt-0.5">{weatherData.description}</div>
                <div className="text-[10px] text-white/40 mt-1">
                  Humidity: {weatherData.humidity}% • Wind: {weatherData.windSpeed} km/h
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white text-right">
                {weatherData.temperature}°C
              </div>
            </div>
          )}
        </div>

        {/* YouTube Search Card */}
        <div id="task-target-tools-yt" className="bg-[#141620] border border-white/10 rounded-2xl p-4 space-y-3 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Youtube size={17} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-white">YouTube Search & Playback</h3>
              <p className="text-[10px] text-white/40">Find songs, playlists, podcasts, or videos</p>
            </div>
          </div>

          <form onSubmit={handleYouTube} className="flex gap-2">
            <input
              type="text"
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              placeholder="e.g., Arijit Singh romantic melodies, tech podcast..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={!ytQuery.trim()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <span>Search</span>
              <ExternalLink size={12} />
            </button>
          </form>
        </div>

        {/* Spotify Search Card */}
        {/* Spotify Search Card */}
        <div id="task-target-tools-spotify" className="bg-[#141620] border border-white/10 rounded-2xl p-4 space-y-3 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Music size={17} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-white">Spotify Web Search</h3>
              <p className="text-[10px] text-white/40">Search albums, tracks, or artists on Spotify</p>
            </div>
          </div>

          <form onSubmit={handleSpotify} className="flex gap-2">
            <input
              type="text"
              value={spotifyQuery}
              onChange={(e) => setSpotifyQuery(e.target.value)}
              placeholder="e.g., Coke Studio Pasoori, Late night lo-fi..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!spotifyQuery.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <span>Search</span>
              <ExternalLink size={12} />
            </button>
          </form>
        </div>

        {/* WhatsApp Web Composer */}
        <div id="task-target-tools-wa" className="bg-[#141620] border border-white/10 rounded-2xl p-4 space-y-3 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400">
              <MessageCircle size={17} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-white">WhatsApp Web Direct Composer</h3>
              <p className="text-[10px] text-white/40">Prefill a WhatsApp message to any phone number</p>
            </div>
          </div>

          <form onSubmit={handleWhatsApp} className="space-y-2">
            <input
              type="tel"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              placeholder="Phone with country code (e.g. +923001234567 or +919876543210)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-green-500 font-mono"
            />
            <textarea
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              placeholder="Message to prefill in WhatsApp..."
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-green-500 resize-none"
            />

            {waError && (
              <div className="text-xs text-red-400 flex items-center gap-1 bg-red-500/10 p-2 rounded-lg">
                <AlertCircle size={13} />
                <span>{waError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                <span>Compose in WhatsApp</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </div>

        {/* Website Quick Launcher */}
        <div id="task-target-tools-web" className="bg-[#141620] border border-white/10 rounded-2xl p-4 space-y-3 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe size={17} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-white">Website Launcher</h3>
              <p className="text-[10px] text-white/40">Directly navigate to any online resource</p>
            </div>
          </div>

          <form onSubmit={handleWeb} className="flex gap-2">
            <input
              type="text"
              value={webQuery}
              onChange={(e) => setWebQuery(e.target.value)}
              placeholder="e.g., google.com, github.com, news.ycombinator.com"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              disabled={!webQuery.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <span>Launch</span>
              <ExternalLink size={12} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
