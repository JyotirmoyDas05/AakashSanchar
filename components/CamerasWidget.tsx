"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface CameraItem {
  id: string;
  title: string;
  city: string;
  country: string;
  region: "EU" | "NA" | "SA" | "AS" | "ME" | "AF" | "OC";
  type: "windy" | "youtube" | "hls";
  embedIdOrUrl: string;
  thumbnailUrl?: string;
}

interface CamerasWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

const REGIONS = [
  { code: "ALL", label: "ALL" },
  { code: "EU", label: "EUROPE" },
  { code: "NA", label: "N. AMERICA" },
  { code: "SA", label: "S. AMERICA" },
  { code: "AS", label: "ASIA" },
  { code: "ME", label: "MIDDLE EAST" },
  { code: "AF", label: "AFRICA" },
  { code: "OC", label: "OCEANIA" },
] as const;

const DEFAULT_CAMERAS: CameraItem[] = [
  // Europe
  {
    id: "cam-milan-duomo",
    title: "Milan - Duomo di Milano",
    city: "Milan",
    country: "IT",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1170927034",
  },
  {
    id: "cam-prague-charles",
    title: "Prague - Charles Bridge & Castle",
    city: "Prague",
    country: "CZ",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1206745451",
  },
  {
    id: "cam-oslo-pipervika",
    title: "Oslo - Pipervika Harbor",
    city: "Oslo",
    country: "NO",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1337867816",
  },
  {
    id: "cam-lake-como",
    title: "Lake Como - Idroscalo Aeroclub",
    city: "Como",
    country: "IT",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1200419751",
  },
  {
    id: "cam-thun-beach",
    title: "Thun - Strandbad Lake View",
    city: "Thun",
    country: "CH",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1242547979",
  },
  {
    id: "cam-france-biscarrosse",
    title: "Biscarrosse - Plage Centrale",
    city: "Biscarrosse",
    country: "FR",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1382842353",
  },
  {
    id: "cam-madeira-pico",
    title: "Madeira - Pico do Areeiro",
    city: "Monte",
    country: "PT",
    region: "EU",
    type: "windy",
    embedIdOrUrl: "1401283880",
  },
  // Africa
  {
    id: "cam-cape-town",
    title: "Cape Town - Table Mountain",
    city: "Cape Town",
    country: "ZA",
    region: "AF",
    type: "windy",
    embedIdOrUrl: "1170887551",
  },
];

const LOCAL_STORAGE_KEY = "world-monitor-camera-preferences";

const getFlagImgUrl = (countryCode: string) => {
  let code = countryCode.trim().toUpperCase();
  if (code === "UK") code = "GB";
  return `https://flagcdn.com/${code.toLowerCase()}.svg`;
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

interface CameraPlayerProps {
  camera: CameraItem;
  isLight: boolean;
}

// renders player for Windy, YouTube or HLS webcams
function CameraPlayer({ camera, isLight }: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // reset on camera change
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, []);

  // config HLS if type is hls
  useEffect(() => {
    if (camera.type !== "hls") return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(camera.embedIdOrUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setHasError(true);
          setIsLoading(false);
          hls?.destroy();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = camera.embedIdOrUrl;
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
      if (hls) hls.destroy();
    };
  }, [camera]);

  if (camera.type === "windy") {
    const windyEmbedUrl = `https://webcams.windy.com/webcams/public/embed/player/${camera.embedIdOrUrl}/day`;
    return (
      <div className="relative w-full h-full bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
              CONNECTING WEBCAM...
            </span>
          </div>
        )}
        <iframe
          src={windyEmbedUrl}
          className="w-full h-full border-0 bg-black"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={camera.title}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  if (camera.type === "youtube") {
    const ytId = getYouTubeId(camera.embedIdOrUrl) || camera.embedIdOrUrl;
    const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full border-0 bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={camera.title}
        onLoad={() => setIsLoading(false)}
      />
    );
  }

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 w-full h-full text-center ${
          isLight ? "bg-slate-105 text-red-600" : "bg-zinc-950 text-red-400"
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest">
          WEBCAM FEED OFFLINE
        </span>
        <span className="text-[8px] opacity-60 mt-1 max-w-50 truncate">
          {camera.embedIdOrUrl}
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
            DECODING FEED...
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

export default function CamerasWidget({
  onClose,
  defaultPosition = { x: 180, y: 180 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: CamerasWidgetProps) {
  const isLight = theme === "light";
  const [cameras, setCameras] = useState<CameraItem[]>(DEFAULT_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<CameraItem | null>(null);
  const [activeRegion, setActiveRegion] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // custom camera overlay states
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("US");
  const [newRegion, setNewRegion] = useState<
    "EU" | "NA" | "SA" | "AS" | "ME" | "AF" | "OC"
  >("NA");
  const [newType, setNewType] = useState<"windy" | "youtube" | "hls">("windy");
  const [newEmbed, setNewEmbed] = useState("");

  // load active cameras dynamically from world-monitor API + custom saved ones
  useEffect(() => {
    let isMounted = true;

    async function loadLiveCameras() {
      try {
        const res = await fetch(
          "https://world-monitor.com/api/cameras?limit=150",
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.webcams) && data.webcams.length > 0) {
            const apiCameras: CameraItem[] = data.webcams.map(
              (wc: {
                id: string;
                title: string;
                location?: {
                  city?: string;
                  countryCode?: string;
                  continentCode?: string;
                };
                image?: { current?: string; daylight?: string };
              }) => ({
                id: `windy-${wc.id}`,
                title: wc.title,
                city: wc.location?.city || wc.title.split(":")[0] || "Live",
                country: wc.location?.countryCode || "IT",
                region: (wc.location?.continentCode ||
                  "EU") as CameraItem["region"],
                type: "windy",
                embedIdOrUrl: wc.id,
                thumbnailUrl:
                  wc.image?.current ||
                  wc.image?.daylight ||
                  `https://imgproxy.windy.com/_/preview/plain/current/${wc.id}/original.jpg`,
              }),
            );

            if (isMounted) {
              const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
              let customOnly: CameraItem[] = [];
              if (saved) {
                try {
                  const parsed = JSON.parse(saved) as CameraItem[];
                  if (Array.isArray(parsed)) {
                    customOnly = parsed.filter((c) =>
                      c.id.startsWith("custom-cam-"),
                    );
                  }
                } catch (_e) {}
              }
              setCameras([...apiCameras, ...customOnly]);
              return;
            }
          }
        }
      } catch (_e) {
        // silent fallback
      }

      if (isMounted) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as CameraItem[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              const defaultIds = DEFAULT_CAMERAS.map((c) => c.id);
              const customOnly = parsed.filter(
                (c) => !defaultIds.includes(c.id),
              );
              setCameras([...DEFAULT_CAMERAS, ...customOnly]);
            }
          } catch (_e) {}
        }
      }
    }

    loadLiveCameras();

    return () => {
      isMounted = false;
    };
  }, []);

  // handle adding custom camera
  const handleAddCameraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newEmbed.trim()) return;

    const newId = `custom-cam-${Date.now()}`;
    const customCam: CameraItem = {
      id: newId,
      title: newTitle.trim(),
      city: newCity.trim() || "Unknown",
      country: newCountry.trim().toUpperCase() || "US",
      region: newRegion,
      type: newType,
      embedIdOrUrl: newEmbed.trim(),
    };

    const updated = [...cameras, customCam];
    setCameras(updated);
    setSelectedCamera(customCam);

    const customList = updated.filter((c) => c.id.startsWith("custom-cam-"));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customList));

    setIsAddingCamera(false);
    setNewTitle("");
    setNewCity("");
    setNewEmbed("");
  };

  // handle deleting custom camera
  const handleDeleteCamera = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = cameras.filter((c) => c.id !== idToDelete);
    setCameras(updated);
    if (selectedCamera?.id === idToDelete) {
      setSelectedCamera(null);
    }
    const customList = updated.filter((c) => c.id.startsWith("custom-cam-"));
    if (customList.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customList));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  // filter cameras list
  const filteredCameras = cameras.filter((cam) => {
    const matchesRegion = activeRegion === "ALL" || cam.region === activeRegion;
    if (!matchesRegion) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const countryName = getCountryName(cam.country).toLowerCase();
    return (
      cam.title.toLowerCase().includes(q) ||
      cam.city.toLowerCase().includes(q) ||
      cam.country.toLowerCase().includes(q) ||
      countryName.includes(q)
    );
  });

  return (
    <FloatingWindow
      title="LIVE OSINT CAMERAS"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <svg
          className="h-4 w-4 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 560, height: 440 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`w-full h-full font-mono flex flex-col justify-between min-h-0 ${
          isLight ? "bg-white text-slate-900" : "bg-black/45 text-slate-200"
        }`}
      >
        {/* Header / Navigation bar */}
        <div
          className={`flex justify-between items-center px-3 py-1.5 border-b text-[10px] font-bold tracking-wider shrink-0 ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-700"
              : "bg-[#090d16]/60 border-[#222] text-slate-400"
          }`}
        >
          {selectedCamera ? (
            <div className="flex items-center gap-2 truncate">
              <button
                type="button"
                onClick={() => setSelectedCamera(null)}
                className={`text-[8px] font-bold py-0.5 px-2 rounded border transition-colors uppercase cursor-pointer ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    : "bg-brand-border hover:bg-[#262626] border-[#333] text-cyan-400"
                }`}
              >
                ← Back
              </button>
              {/* biome-ignore lint/performance/noImgElement: flag icon */}
              <img
                src={getFlagImgUrl(selectedCamera.country)}
                alt={selectedCamera.country}
                title={getCountryName(selectedCamera.country)}
                className="w-4 h-3 object-contain cursor-help shrink-0"
              />
              <span className="uppercase text-green-500 truncate">
                {selectedCamera.title}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center w-full">
              <span className="text-[9px] uppercase text-cyan-400 font-bold tracking-widest">
                WEBCAMS CATALOG ({filteredCameras.length}/{cameras.length})
              </span>
              <span className="text-[7px] text-slate-500 font-sans">
                Flags via{" "}
                <a
                  href="https://flagpedia.net"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline hover:text-slate-400"
                >
                  Flagpedia
                </a>
              </span>
            </div>
          )}

          {selectedCamera && (
            <span className="flex items-center gap-1 text-red-500 font-black animate-pulse shrink-0 ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              LIVE
            </span>
          )}
        </div>

        {/* Viewport area */}
        <div
          className={`relative flex-1 bg-black overflow-hidden flex flex-col border-b ${
            isLight ? "border-slate-200" : "border-[#222]"
          }`}
        >
          <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-20 z-20" />

          {selectedCamera ? (
            /* Detail player view */
            <div className="relative w-full h-full flex flex-col">
              <CameraPlayer camera={selectedCamera} isLight={isLight} />
            </div>
          ) : (
            /* Catalog grid view */
            <div className="flex-1 min-h-0 flex flex-col p-2.5 space-y-2">
              {/* Region filter tabs */}
              <div className="flex gap-1 overflow-x-auto shrink-0 pb-1">
                {REGIONS.map((r) => {
                  const isActive = activeRegion === r.code;
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setActiveRegion(r.code)}
                      className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                        isActive
                          ? isLight
                            ? "bg-cyan-100 border-cyan-300 text-cyan-800 shadow-sm"
                            : "bg-cyan-950/40 border-cyan-500/40 text-[#00c7fc] shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                          : isLight
                            ? "bg-slate-55 hover:bg-slate-100 border-slate-200 text-slate-650"
                            : "bg-black/30 hover:bg-brand-border border-[#222] text-slate-400"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder="Search webcams (e.g. Tokyo, Times Square, Paris)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium shrink-0 ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                    : "border-[#222] bg-black/60 text-white focus:border-cyan-500"
                }`}
              />

              {/* Camera Grid List */}
              <div
                className={`flex-1 min-h-0 overflow-y-auto border rounded p-1.5 grid grid-cols-2 gap-2 ${
                  isLight
                    ? "border-slate-200 bg-slate-50/50"
                    : "border-[#222] bg-black/40"
                }`}
              >
                {filteredCameras.map((cam) => {
                  const isCustom = cam.id.startsWith("custom-cam-");
                  const thumb =
                    cam.thumbnailUrl ||
                    (cam.type === "windy"
                      ? `https://imgproxy.windy.com/_/preview/plain/current/${cam.embedIdOrUrl}/original.jpg`
                      : undefined);

                  return (
                    <div
                      key={cam.id}
                      onClick={() => setSelectedCamera(cam)}
                      className={`relative group/cam border rounded p-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isLight
                          ? "border-slate-200 bg-white hover:bg-slate-100 hover:border-cyan-400"
                          : "border-[#222] bg-black/50 hover:bg-white/5 hover:border-cyan-500/40"
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      <div className="relative aspect-video w-full rounded overflow-hidden bg-zinc-900 mb-1.5 shrink-0">
                        {thumb ? (
                          /* biome-ignore lint/performance/noImgElement: camera thumbnail */
                          <img
                            src={thumb}
                            alt={cam.title}
                            className="w-full h-full object-cover group-hover/cam:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-600 font-bold uppercase">
                            LIVE FEED
                          </div>
                        )}
                        <span className="absolute top-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[7px] font-bold text-cyan-400 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-cyan-400 animate-ping" />
                          WEBCAM
                        </span>
                      </div>

                      {/* Info & Location */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold truncate text-[10px] flex items-center gap-1 text-slate-200">
                          {/* biome-ignore lint/performance/noImgElement: flag icon */}
                          <img
                            src={getFlagImgUrl(cam.country)}
                            alt={cam.country}
                            title={getCountryName(cam.country)}
                            className="w-3.5 h-2.5 object-contain shrink-0 cursor-help"
                          />
                          <span className="truncate">{cam.title}</span>
                        </div>
                        <div className="text-[8px] text-slate-500 truncate">
                          {cam.city}, {getCountryName(cam.country)}
                        </div>
                      </div>

                      {/* Custom Delete Cross */}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCamera(cam.id, e)}
                          className="absolute top-1 right-1 hidden group-hover/cam:flex items-center justify-center w-4 h-4 text-[10px] font-bold text-red-500 hover:text-red-400 bg-black/70 border border-red-500/30 rounded-full transition-colors cursor-pointer z-30"
                          title="Remove camera"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Custom Camera Overlay */}
          {isAddingCamera && (
            <div
              className={`absolute inset-0 z-30 flex flex-col p-3 font-mono border-t ${
                isLight
                  ? "bg-white/95 text-slate-900 border-slate-200"
                  : "bg-zinc-950/95 text-slate-200 border-[#222]"
              }`}
            >
              <div className="flex justify-between items-center mb-3 border-b border-cyan-500/20 pb-1.5 shrink-0 text-[10px] font-bold">
                <span className="text-cyan-400 uppercase">
                  [ ADD CUSTOM WEBCAM ]
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCamera(false)}
                  className="text-red-400 hover:text-red-300 cursor-pointer"
                >
                  [ CLOSE ]
                </button>
              </div>

              <form
                onSubmit={handleAddCameraSubmit}
                className="space-y-2 flex flex-col justify-center h-full max-w-sm mx-auto w-full min-h-0 overflow-y-auto"
              >
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                    Webcam Title
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Harbor Panoramic View"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium ${
                      isLight
                        ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                        : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                      City / Location
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Athens"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium ${
                        isLight
                          ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                          : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                      }`}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                      Country Code (2-letter)
                    </span>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="e.g. GR, US, IN"
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      required
                      className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium uppercase ${
                        isLight
                          ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                          : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                      Region
                    </span>
                    <select
                      value={newRegion}
                      onChange={(e) =>
                        setNewRegion(e.target.value as CameraItem["region"])
                      }
                      className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium ${
                        isLight
                          ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                          : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                      }`}
                    >
                      <option value="EU">Europe</option>
                      <option value="NA">North America</option>
                      <option value="SA">South America</option>
                      <option value="AS">Asia</option>
                      <option value="ME">Middle East</option>
                      <option value="AF">Africa</option>
                      <option value="OC">Oceania</option>
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                      Source Type
                    </span>
                    <select
                      value={newType}
                      onChange={(e) =>
                        setNewType(e.target.value as CameraItem["type"])
                      }
                      className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium ${
                        isLight
                          ? "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
                          : "border-gray-800 bg-black/60 text-white focus:border-cyan-500"
                      }`}
                    >
                      <option value="windy">Windy ID</option>
                      <option value="youtube">YouTube URL/ID</option>
                      <option value="hls">HLS (.m3u8)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">
                    Windy Webcam ID or Stream URL
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 1520625413 or https://..."
                    value={newEmbed}
                    onChange={(e) => setNewEmbed(e.target.value)}
                    required
                    className={`w-full text-[10px] px-2 py-1 rounded border outline-none font-sans font-medium ${
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
                    Add Webcam
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCamera(false)}
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
            </div>
          )}
        </div>

        {/* Bottom controls / Add Camera trigger */}
        <div className="shrink-0 flex items-center justify-between p-2.5">
          <button
            type="button"
            onClick={() => setIsAddingCamera(true)}
            className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer ${
              isLight
                ? "text-cyan-700 hover:text-cyan-800"
                : "text-cyan-400 hover:text-[#00c7fc]"
            }`}
          >
            <span>+ ADD CUSTOM CAMERA</span>
          </button>
          <span
            className={`text-[8px] font-mono ${
              isLight ? "text-slate-500" : "text-slate-500"
            }`}
          >
            SENSORS: {cameras.length} ONLINE
          </span>
        </div>
      </div>
    </FloatingWindow>
  );
}
