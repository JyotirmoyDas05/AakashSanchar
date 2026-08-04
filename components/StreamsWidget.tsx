"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface StreamData {
  id: string;
  name: string;
  url: string;
}

interface IPTVChannel {
  name: string;
  url: string;
  group?: string;
  country?: string;
}

interface StreamsWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

const DEFAULT_STREAMS: StreamData[] = [
  {
    id: "str-bloomberg",
    name: "Bloomberg",
    url: "https://www.youtube.com/watch?v=QB5BNdBFujE",
  },
  {
    id: "str-skynews",
    name: "Sky News",
    url: "https://www.youtube.com/watch?v=YDvsBbKfLPA",
  },
  {
    id: "str-euronews",
    name: "Euronews",
    url: "https://www.youtube.com/watch?v=pykpO5kQJ98",
  },
  {
    id: "str-dw",
    name: "DW News",
    url: "https://www.youtube.com/watch?v=LuKwFajn37U",
  },
  {
    id: "str-france24",
    name: "France 24",
    url: "https://www.youtube.com/watch?v=z5zUCLtYpM0",
  },
  {
    id: "str-nasatv",
    name: "NASA TV",
    url: "https://www.youtube.com/embed/M3HKLzjvKPc",
  },
];

const LOCAL_STORAGE_KEY = "world-monitor-stream-preferences";

const getFlagEmoji = (countryCode: string) => {
  let code = countryCode.trim().toUpperCase();
  if (code === "UK") code = "GB";
  if (code.length !== 2) return "";
  const codePoints = code.split("").map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (_e) {
    return "";
  }
};

const getCountryName = (countryCode: string) => {
  let code = countryCode.trim().toUpperCase();
  if (code === "UK") code = "GB";
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) || code;
  } catch (_e) {
    return code;
  }
};

const getFlagImgUrl = (countryCode: string) => {
  let code = countryCode.trim().toUpperCase();
  if (code === "UK") code = "GB";
  return `https://flagcdn.com/${code.toLowerCase()}.svg`;
};

const getYouTubeId = (url: string) => {
  const trimmed = url.trim();
  if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes("/live/")) {
    const parts = trimmed.split("/live/");
    if (parts[1]) {
      const idPart = parts[1].split(/[?#&]/)[0];
      if (idPart.length === 11) return idPart;
    }
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const getYouTubeEmbedUrl = (url: string) => {
  const trimmed = url.trim();
  if (trimmed.includes("youtube.com/embed/")) {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}autoplay=1&mute=1&playsinline=1`;
  }
  const videoId = getYouTubeId(trimmed);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
  }
  return null;
};

const getStreamType = (url: string): "youtube" | "hls" => {
  const trimmed = url.trim();
  if (trimmed.includes("youtube.com/embed/") || getYouTubeId(trimmed)) {
    return "youtube";
  }
  return "hls";
};

const parseM3U = (text: string): IPTVChannel[] => {
  const lines = text.split("\n");
  const channels: IPTVChannel[] = [];
  let currentName = "";
  let currentGroup = "";
  let currentCountry = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      const commaIdx = line.lastIndexOf(",");
      currentName =
        commaIdx !== -1
          ? line.substring(commaIdx + 1).trim()
          : "Unknown Channel";
      const groupMatch = line.match(/group-title="([^"]+)"/);
      currentGroup = groupMatch ? groupMatch[1] : "";

      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
      if (tvgIdMatch) {
        const tvgId = tvgIdMatch[1];
        const baseId = tvgId.split("@")[0];
        const parts = baseId.split(".");
        const ext = parts[parts.length - 1];
        if (ext && ext.length === 2 && /^[a-zA-Z]{2}$/.test(ext)) {
          currentCountry = ext.toUpperCase();
        }
      }
    } else if (line.startsWith("http")) {
      if (currentName) {
        channels.push({
          name: currentName,
          url: line,
          group: currentGroup || undefined,
          country: currentCountry || undefined,
        });
        currentName = "";
        currentGroup = "";
        currentCountry = "";
      }
    }
  }
  return channels;
};

const scoreMatch = (name: string, query: string): number => {
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // exact
  if (lowerName === lowerQuery) return 1000;

  // starts
  if (lowerName.startsWith(lowerQuery)) return 800 - lowerName.length;

  // index
  const idx = lowerName.indexOf(lowerQuery);
  if (idx !== -1) {
    return 600 - idx - lowerName.length;
  }

  // words
  const queryWords = lowerQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return 0;

  let allWordsPresent = true;
  let wordScore = 100;

  for (let i = 0; i < queryWords.length; i++) {
    const qw = queryWords[i];
    const pos = lowerName.indexOf(qw);
    if (pos === -1) {
      allWordsPresent = false;
      break;
    }
    wordScore += 100 - pos;
  }

  if (allWordsPresent) {
    let lastIdx = -1;
    let orderMatched = true;
    for (let i = 0; i < queryWords.length; i++) {
      const qw = queryWords[i];
      const pos = lowerName.indexOf(qw, lastIdx + 1);
      if (pos === -1 || pos < lastIdx) {
        orderMatched = false;
        break;
      }
      lastIdx = pos;
    }
    if (orderMatched) wordScore += 200;
    return wordScore - lowerName.length;
  }

  return 0;
};

interface StreamPlayerProps {
  url: string;
  isLight: boolean;
}

// renders media player
function StreamPlayer({ url, isLight }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isYoutube = getStreamType(url) === "youtube";

  // config player and reset states
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);

    if (isYoutube) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setHasError(true);
              setIsLoading(false);
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener("error", () => {
        setHasError(true);
        setIsLoading(false);
      });
    } else {
      setHasError(true);
      setIsLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, isYoutube]);

  if (isYoutube) {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Stream Player"
          onLoad={() => setIsLoading(false)}
        />
      );
    }
  }

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 w-full h-full text-center ${
          isLight ? "bg-slate-105 text-red-600" : "bg-zinc-950 text-red-400"
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest">
          FEED OFFLINE / UNREADABLE
        </span>
        <span className="text-[8px] opacity-60 mt-1 max-w-62.5 truncate">
          {url}
        </span>
        <span className="text-[7px] opacity-40 mt-1 text-slate-500 max-w-50">
          Note: HLS feeds often fail in browsers due to CORS restrictions or
          geoblocks.
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
            DECODING...
          </span>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        muted
        playsInline
      />
    </div>
  );
}

export default function StreamsWidget({
  onClose,
  defaultPosition = { x: 140, y: 140 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: StreamsWidgetProps) {
  const isLight = theme === "light";
  const [streams, setStreams] = useState<StreamData[]>(DEFAULT_STREAMS);
  const [activeStreamId, setActiveStreamId] = useState<string>("str-bloomberg");

  // overlay states
  const [isAddingStream, setIsAddingStream] = useState(false);
  const [addTab, setAddTab] = useState<"manual" | "iptv">("manual");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // iptv states
  const [iptvLoading, setIptvLoading] = useState(false);
  const [iptvError, setIptvError] = useState<string | null>(null);
  const [iptvChannels, setIptvChannels] = useState<IPTVChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IPTVChannel[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // load custom feeds
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as StreamData[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const defaultIds = DEFAULT_STREAMS.map((s) => s.id);
            const customOnly = parsed.filter((s) => !defaultIds.includes(s.id));
            setStreams([...DEFAULT_STREAMS, ...customOnly]);
          }
        } catch (_e) {
          // silent
        }
      }
    }
  }, []);

  // fetches iptv catalog
  const fetchIPTVChannels = useCallback(async () => {
    if (iptvChannels.length > 0) return;
    setIptvLoading(true);
    setIptvError(null);
    try {
      const res = await fetch("https://iptv-org.github.io/iptv/index.m3u");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const text = await res.text();
      const parsed = parseM3U(text);
      setIptvChannels(parsed);
    } catch (_err) {
      setIptvError("Failed to download IPTV database. Please retry.");
    } finally {
      setIptvLoading(false);
    }
  }, [iptvChannels.length]);

  // trigger fetch on tab switch
  useEffect(() => {
    if (isAddingStream && addTab === "iptv") {
      fetchIPTVChannels();
    }
  }, [isAddingStream, addTab, fetchIPTVChannels]);

  // filter search results using fuzzy scoring
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const scored = iptvChannels
      .map((c) => ({ chan: c, score: scoreMatch(c.name, query) }))
      .filter((item) => item.score > 0);

    const sorted = scored
      .sort(
        (a, b) => b.score - a.score || a.chan.name.localeCompare(b.chan.name),
      )
      .map((item) => item.chan)
      .slice(0, 50);

    setSearchResults(sorted);
  }, [searchQuery, iptvChannels]);

  // build country list dynamically
  const countriesList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < iptvChannels.length; i++) {
      const c = iptvChannels[i];
      if (c.country) {
        const code = c.country.toUpperCase();
        counts[code] = (counts[code] || 0) + 1;
      }
    }

    const list: { code: string; name: string; flag: string; count: number }[] =
      [];
    let regionNames: Intl.DisplayNames | null = null;
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch (_e) {}

    for (const [code, count] of Object.entries(counts)) {
      let name = code;
      if (regionNames) {
        try {
          name = regionNames.of(code) || code;
        } catch (_e) {}
      }
      list.push({
        code,
        name,
        flag: getFlagEmoji(code),
        count,
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [iptvChannels]);

  // filtered channels by selected country
  const countryChannels = useMemo(() => {
    if (!selectedCountry) return [];
    return iptvChannels.filter(
      (c) => c.country?.toUpperCase() === selectedCountry.toUpperCase(),
    );
  }, [selectedCountry, iptvChannels]);

  const activeStream =
    streams.find((s) => s.id === activeStreamId) || streams[0];

  // handle manual add
  const handleAddStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    const newId = `custom-${Date.now()}`;
    const newStream: StreamData = {
      id: newId,
      name: newName.trim(),
      url: newUrl.trim(),
    };

    const updated = [...streams, newStream];
    setStreams(updated);
    setActiveStreamId(newId);

    const customStreams = updated.filter((s) => s.id.startsWith("custom-"));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customStreams));

    setIsAddingStream(false);
    setNewName("");
    setNewUrl("");
  };

  // handle adding from iptv catalog
  const handleAddIPTVChannel = (chan: IPTVChannel) => {
    const newId = `custom-${Date.now()}`;
    const newStream: StreamData = {
      id: newId,
      name: chan.name,
      url: chan.url,
    };

    const updated = [...streams, newStream];
    setStreams(updated);
    setActiveStreamId(newId);

    const customStreams = updated.filter((s) => s.id.startsWith("custom-"));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customStreams));

    setIsAddingStream(false);
    setSearchQuery("");
    setSelectedCountry(null);
  };

  // handle deleting custom stream
  const handleDeleteStream = (idToDelete: string) => {
    const updated = streams.filter((s) => s.id !== idToDelete);
    setStreams(updated);
    if (activeStreamId === idToDelete) {
      setActiveStreamId("str-bloomberg");
    }
    const customStreams = updated.filter((s) => s.id.startsWith("custom-"));
    if (customStreams.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customStreams));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  return (
    <FloatingWindow
      title="STREAMS"
      theme={theme}
      layoutMode={layoutMode}
      icon={<span className="h-2 w-2 rounded-full bg-cyan-400" />}
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 560, height: 430 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`w-full h-full font-mono flex flex-col justify-between min-h-0 ${
          isLight ? "bg-white text-slate-900" : "bg-black/45 text-slate-200"
        }`}
      >
        {/* Stream info row */}
        <div
          className={`flex justify-between items-center px-3 py-1.5 border-b text-[10px] font-bold tracking-wider shrink-0 ${
            isLight
              ? "bg-slate-55 border-slate-200 text-slate-700"
              : "bg-[#090d16]/60 border-[#222] text-slate-400"
          }`}
        >
          <span className="uppercase text-green-500">{activeStream.name}</span>
          <span className="flex items-center gap-1 text-red-500 font-black animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            ON AIR
          </span>
        </div>

        {/* Video viewport / overlay area */}
        <div
          className={`relative flex-1 bg-black overflow-hidden flex items-center justify-center border-b ${
            isLight ? "border-slate-200" : "border-[#222]"
          }`}
        >
          <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-20 z-20" />
          <StreamPlayer url={activeStream.url} isLight={isLight} />

          {/* Add Stream/IPTV Catalog Overlay */}
          {isAddingStream && (
            <div
              className={`absolute inset-0 z-30 flex flex-col p-3 font-mono border-t ${
                isLight
                  ? "bg-white/95 text-slate-900 border-slate-200"
                  : "bg-zinc-950/95 text-slate-200 border-[#222]"
              }`}
            >
              {/* Tab headers */}
              <div className="flex gap-2 mb-3 border-b border-cyan-500/20 pb-1.5 shrink-0 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setAddTab("manual")}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    addTab === "manual"
                      ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/30"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  [ MANUAL ADD ]
                </button>
                <button
                  type="button"
                  onClick={() => setAddTab("iptv")}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    addTab === "iptv"
                      ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/30"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  [ IPTV SEARCH (20K+) ]
                </button>

                {/* Close Overlay */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingStream(false);
                    setSearchQuery("");
                    setSelectedCountry(null);
                  }}
                  className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                >
                  [ CLOSE ]
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 min-h-0 flex flex-col justify-between">
                {addTab === "manual" ? (
                  <form
                    onSubmit={handleAddStreamSubmit}
                    className="space-y-3 flex flex-col justify-center h-full max-w-sm mx-auto w-full"
                  >
                    <div className="space-y-1">
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                        Stream Name
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. My Local Feed"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                        className={`w-full text-[10px] px-2 py-1.5 rounded border outline-none font-sans font-medium ${
                          isLight
                            ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                            : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                        YouTube URL/ID or HLS (.m3u8) URL
                      </span>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        required
                        className={`w-full text-[10px] px-2 py-1.5 rounded border outline-none font-sans font-medium ${
                          isLight
                            ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                            : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                        }`}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className={`text-[9px] px-4 py-1.5 rounded font-bold uppercase transition-colors flex-1 cursor-pointer ${
                          isLight
                            ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                            : "bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 border border-cyan-500/30"
                        }`}
                      >
                        Add Stream
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingStream(false);
                          setNewName("");
                          setNewUrl("");
                        }}
                        className={`text-[9px] px-4 py-1.5 rounded font-bold uppercase transition-colors flex-1 cursor-pointer ${
                          isLight
                            ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                            : "bg-gray-850 hover:bg-gray-800 text-slate-350 border border-gray-700"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col">
                    {iptvLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest animate-pulse">
                          Downloading IPTV database...
                        </span>
                      </div>
                    ) : iptvError ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest mb-2">
                          {iptvError}
                        </span>
                        <button
                          type="button"
                          onClick={fetchIPTVChannels}
                          className="text-[9px] px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 border border-cyan-500/30 rounded font-bold uppercase cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 flex flex-col space-y-2">
                        <input
                          type="text"
                          placeholder="Search 20k+ channels (e.g. India, BBC, Sky, Tokyo)..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value.trim().length >= 2) {
                              setSelectedCountry(null);
                            }
                          }}
                          className={`w-full text-[10px] px-2 py-1.5 rounded border outline-none font-sans font-medium shrink-0 ${
                            isLight
                              ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                              : "border-[#222] bg-black/60 text-white focus:border-cyan-500"
                          }`}
                        />

                        {searchQuery.trim().length >= 2 ? (
                          /* Render search results */
                          searchResults.length > 0 ? (
                            <div
                              className={`flex-1 min-h-0 overflow-y-auto border rounded divide-y ${
                                isLight
                                  ? "border-slate-200 bg-slate-50/50 divide-slate-100"
                                  : "border-[#222] bg-black/40 divide-gray-900"
                              }`}
                            >
                              {searchResults.map((chan, idx) => (
                                <button
                                  key={`${chan.url}-${idx}`}
                                  type="button"
                                  onClick={() => handleAddIPTVChannel(chan)}
                                  className={`w-full text-left px-2 py-2 text-[9px] font-bold flex justify-between items-center transition-colors cursor-pointer ${
                                    isLight
                                      ? "hover:bg-slate-100 text-slate-700"
                                      : "hover:bg-white/5 text-slate-300"
                                  }`}
                                >
                                  <span className="truncate pr-4 flex items-center gap-1.5">
                                    {chan.country && (
                                      <span className="inline-flex items-center select-none shrink-0">
                                        {/* biome-ignore lint/performance/noImgElement: flag icon */}
                                        <img
                                          src={getFlagImgUrl(chan.country)}
                                          alt={chan.country}
                                          title={getCountryName(chan.country)}
                                          className="w-4.5 h-3 object-contain cursor-help"
                                        />
                                      </span>
                                    )}
                                    <span className="truncate">
                                      {chan.name}
                                    </span>
                                  </span>
                                  {chan.group && (
                                    <span
                                      className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                                        isLight
                                          ? "bg-slate-200 text-slate-650"
                                          : "bg-zinc-800 text-zinc-400"
                                      }`}
                                    >
                                      {chan.group}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                              <span className="text-[9px] font-bold uppercase tracking-wider">
                                No channels found matching query.
                              </span>
                            </div>
                          )
                        ) : selectedCountry ? (
                          /* Render channels for selected country */
                          <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCountry(null)}
                                className={`text-[8px] font-bold py-0.5 px-2 rounded border transition-colors uppercase cursor-pointer ${
                                  isLight
                                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                                    : "bg-brand-border hover:bg-[#262626] border-[#333] text-cyan-400"
                                }`}
                              >
                                ← Back
                              </button>
                              <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                                {/* biome-ignore lint/performance/noImgElement: flag icon */}
                                <img
                                  src={getFlagImgUrl(selectedCountry)}
                                  alt={selectedCountry}
                                  className="w-4.5 h-3 object-contain"
                                />
                                {getCountryName(selectedCountry)} (
                                {countryChannels.length} feeds)
                              </span>
                            </div>
                            <div
                              className={`flex-1 min-h-0 overflow-y-auto border rounded divide-y ${
                                isLight
                                  ? "border-slate-200 bg-slate-50/50 divide-slate-100"
                                  : "border-[#222] bg-black/40 divide-gray-900"
                              }`}
                            >
                              {countryChannels.map((chan, idx) => (
                                <button
                                  key={`${chan.url}-${idx}`}
                                  type="button"
                                  onClick={() => handleAddIPTVChannel(chan)}
                                  className={`w-full text-left px-2 py-2 text-[9px] font-bold flex justify-between items-center transition-colors cursor-pointer ${
                                    isLight
                                      ? "hover:bg-slate-100 text-slate-700"
                                      : "hover:bg-white/5 text-slate-300"
                                  }`}
                                >
                                  <span className="truncate pr-4">
                                    {chan.name}
                                  </span>
                                  {chan.group && (
                                    <span
                                      className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                                        isLight
                                          ? "bg-slate-200 text-slate-650"
                                          : "bg-zinc-800 text-zinc-400"
                                      }`}
                                    >
                                      {chan.group}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
                            <div className="flex justify-between items-center shrink-0">
                              <span
                                className={`text-[8px] font-bold uppercase tracking-widest ${
                                  isLight ? "text-slate-500" : "text-slate-500"
                                }`}
                              >
                                Browse by Country
                              </span>
                              <span className="text-[8.5px] text-slate-500 font-sans">
                                Flags via{" "}
                                <a
                                  href="https://flagpedia.net"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-cyan-400 transition-colors"
                                >
                                  Flagpedia
                                </a>
                              </span>
                            </div>
                            <div
                              className={`flex-1 min-h-0 overflow-y-auto border rounded p-1.5 grid grid-cols-2 gap-1.5 ${
                                isLight
                                  ? "border-slate-200 bg-slate-50/50"
                                  : "border-[#222] bg-black/40"
                              }`}
                            >
                              {countriesList.map((country) => (
                                <button
                                  key={country.code}
                                  type="button"
                                  onClick={() =>
                                    setSelectedCountry(country.code)
                                  }
                                  className={`text-left px-2 py-1.5 text-[9px] font-bold border rounded flex items-center justify-between transition-all cursor-pointer ${
                                    isLight
                                      ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:border-slate-350"
                                      : "border-[#222] bg-black/50 hover:bg-white/5 text-slate-300 hover:border-gray-700"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    {/* biome-ignore lint/performance/noImgElement: flag icon */}
                                    <img
                                      src={getFlagImgUrl(country.code)}
                                      alt={country.code}
                                      className="w-4.5 h-3 object-contain shrink-0"
                                    />
                                    <span className="truncate">
                                      {country.name}
                                    </span>
                                  </span>
                                  <span
                                    className={`text-[7px] font-mono shrink-0 px-1 rounded ${
                                      isLight
                                        ? "bg-slate-100 text-slate-500"
                                        : "bg-zinc-800/60 text-zinc-500"
                                    }`}
                                  >
                                    {country.count}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom channels tab list */}
        <div className="shrink-0 flex flex-col gap-1.5 p-2.5">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto max-h-20">
            {streams.map((stream) => {
              const isSelected = stream.id === activeStreamId;
              const isCustom = stream.id.startsWith("custom-");
              return (
                <div
                  key={stream.id}
                  className="relative group/tab inline-block"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStreamId(stream.id);
                      // close add overlay if switching stream
                      setIsAddingStream(false);
                      setSelectedCountry(null);
                      setSearchQuery("");
                    }}
                    className={`text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      isSelected
                        ? isLight
                          ? "bg-cyan-100 border-cyan-300 text-cyan-800 shadow-sm"
                          : "bg-cyan-950/40 border-cyan-500/40 text-[#00c7fc] shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : isLight
                          ? "bg-slate-55 hover:bg-slate-100 border-slate-200 text-slate-650"
                          : "bg-black/30 hover:bg-brand-border border-[#222] text-slate-400"
                    } ${isCustom ? "pr-7" : ""}`}
                  >
                    {stream.name}
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStream(stream.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/tab:flex items-center justify-center w-3.5 h-3.5 text-[10px] font-bold text-red-500 hover:text-red-450 hover:bg-red-500/10 bg-red-700/30 border border-red-500/30 hover:border-red-500/50 rounded-full transition-colors cursor-pointer"
                      title="Remove stream"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsAddingStream(true)}
            className={`text-[9px] font-bold self-start mt-0.5 uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer ${
              isLight
                ? "text-cyan-700 hover:text-cyan-800"
                : "text-cyan-400 hover:text-[#00c7fc]"
            }`}
          >
            <span>+ ADD STREAM</span>
          </button>
        </div>
      </div>
    </FloatingWindow>
  );
}
