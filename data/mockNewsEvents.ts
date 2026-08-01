import type { NewsEvent } from "@/types/news";

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export const mockNewsEvents: NewsEvent[] = [
  // ── CONFLICTS (Red / Orange) ──
  {
    id: "ev-con-1",
    title: "Maritime Security Alert: Vessel Boarded in Strait of Hormuz",
    description:
      "A commercial tanker sailing under a panamanian flag was boarded by armed personnel in international waters. Coastal patrols are responding.",
    source: "Gulf Intel Group",
    category: "conflict",
    publishedAt: ago(0.3), // 18m ago
    locationName: "Strait of Hormuz",
    lat: 26.5667,
    lng: 56.25,
    intensity: 0.95,
  },
  {
    id: "ev-con-2",
    title: "Artillery Shelling Reported Near Zaporizhzhia Substation",
    description:
      "Local monitoring units reported heavy artillery detonations within 2km of the electrical switch yard. Nuclear sensors show normal baseline radiation.",
    source: "EU OSINT Wire",
    category: "conflict",
    publishedAt: ago(1.2), // 1.2h ago
    locationName: "Zaporizhzhia, Ukraine",
    lat: 47.508,
    lng: 35.118,
    intensity: 0.9,
  },
  {
    id: "ev-con-3",
    title: "Border Skirmish Detonates Along Southern Frontier Lines",
    description:
      "Border forces exchanged brief small-arms fire near rural verification posts. Diplomatic contact initiated to coordinate ceasefire terms.",
    source: "Middle East Live",
    category: "conflict",
    publishedAt: ago(5.0), // 5h ago
    locationName: "Tehran Frontier, Iran",
    lat: 35.6892,
    lng: 51.389,
    intensity: 0.72,
  },
  {
    id: "ev-con-4",
    title: "Clashes Erupt in Central Administrative District",
    description:
      "Protesters clashed with security guards outside ministry gates following a sudden national decree restricting local currency conversions.",
    source: "Caracas Tribune",
    category: "conflict",
    publishedAt: ago(18.0), // 18h ago
    locationName: "Caracas, Venezuela",
    lat: 10.5,
    lng: -66.903,
    intensity: 0.81,
  },

  // ── DISASTERS (Red) ──
  {
    id: "ev-dis-1",
    title: "Magnitude 6.2 Earthquake Strikes Coastal Trench Line",
    description:
      "A shallow seismic shift at a depth of 12km triggered strong tremors. Buildings cracked, and structural checks are active across coastal ports.",
    source: "Seismic Monitor",
    category: "disaster",
    publishedAt: ago(0.6), // 36m ago
    locationName: "Caracas Coast, Venezuela",
    lat: 10.6,
    lng: -66.8,
    intensity: 0.88,
  },
  {
    id: "ev-dis-2",
    title: "Wildfire Incursions Damage Northern High-Voltage Lines",
    description:
      "Fast-moving brush fires have breached isolation zones, taking three regional distribution lines offline. Utility grids are routing emergency reserves.",
    source: "CalFire Broadcast",
    category: "disaster",
    publishedAt: ago(3.5), // 3.5h ago
    locationName: "Sacramento, California",
    lat: 38.5816,
    lng: -121.4944,
    intensity: 0.75,
  },
  {
    id: "ev-dis-3",
    title: "Flash Flood Alert Level Raised to Red as Levee Overflows",
    description:
      "River levels peaked 2 meters above standard banks. Emergency response agencies are organizing evacuations in low-lying suburban wards.",
    source: "National Weather",
    category: "disaster",
    publishedAt: ago(22.0), // 22h ago
    locationName: "London District, UK",
    lat: 51.5074,
    lng: -0.1278,
    intensity: 0.68,
  },

  // ── HEALTH / BIOLOGICAL (Purple / Pink) ──
  {
    id: "ev-med-1",
    title: "Ebola Outbreak Confirmed in Eastern Forestry Zone",
    description:
      "The regional health ministry has validated three active cases of Ebola Sudan strain. Contact tracers are establishing containment perimeters.",
    source: "World Health Org",
    category: "health",
    publishedAt: ago(2.5), // 2.5h ago
    locationName: "Bundibugyo, Uganda",
    lat: 0.706,
    lng: 30.063,
    intensity: 0.85,
  },
  {
    id: "ev-med-2",
    title: "Cruise Liner Quarantined Following Viral Outbreak",
    description:
      "Forty passengers aboard the cruise vessel have presented severe respiratory symptoms. Local health officers are boarding to screen for Hantavirus.",
    source: "Port Authority",
    category: "health",
    publishedAt: ago(11.0), // 11h ago
    locationName: "Miami Harbor, Florida",
    lat: 25.7617,
    lng: -80.1918,
    intensity: 0.78,
  },
  {
    id: "ev-med-3",
    title: "Avian Influenza Detected in Local Commercial Poultry Farms",
    description:
      "A highly pathogenic strain has been identified, triggering a quarantine area of 10km. Health agents are testing immediate farm workers.",
    source: "AgriHealth Alert",
    category: "health",
    publishedAt: ago(36.0), // 1.5d ago
    locationName: "Tokyo Wards, Japan",
    lat: 35.6762,
    lng: 139.6503,
    intensity: 0.7,
  },

  // ── SPACE / SATELLITE (Cyan / Blue) ──
  {
    id: "ev-spa-1",
    title: "X-Class Solar Flare Hits Earth Magnetosphere",
    description:
      "An X3.4 flare erupted from Sunspot AR3211, triggering high-frequency radio blackouts over the western hemisphere and vibrant polar auroras.",
    source: "Space Weather Desk",
    category: "space",
    publishedAt: ago(4.2), // 4.2h ago
    locationName: "Cape Canaveral, Florida",
    lat: 28.5721,
    lng: -80.648,
    intensity: 0.92,
  },
  {
    id: "ev-spa-2",
    title: "Debris Cloud Tracked Following Satellite Collision",
    description:
      "Commercial radars mapped 15 new debris pieces in low Earth orbit. Satellites in nearby orbital pathways are coordinating evasive maneuvers.",
    source: "Space Force Command",
    category: "space",
    publishedAt: ago(25.0), // 25h ago
    locationName: "Low Earth Orbit",
    lat: 40.7128,
    lng: -74.006,
    intensity: 0.8,
  },

  // ── NEWS / GEOPOLITICAL (Grey / Blue) ──
  {
    id: "ev-new-1",
    title: "Sovereign Funding Reallocated to Cyber Security Infrastructure",
    description:
      "Federal budget divisions reallocated $4.2B to strengthen public cloud servers and municipal grid defense centers against external state groups.",
    source: "Federal Register",
    category: "news",
    publishedAt: ago(1.8), // 1.8h ago
    locationName: "Washington D.C., USA",
    lat: 38.9072,
    lng: -77.0369,
    intensity: 0.74,
  },
  {
    id: "ev-new-2",
    title: "Diplomatic Envoys Convene for Middle East Maritime Security",
    description:
      "Delegates from eight states met in Qatar to draft shipping lane defense agreements. The draft focuses on cargo route protection.",
    source: "Diplomacy Today",
    category: "news",
    publishedAt: ago(8.5), // 8.5h ago
    locationName: "Doha, Qatar",
    lat: 25.2854,
    lng: 51.531,
    intensity: 0.69,
  },
  {
    id: "ev-new-3",
    title: "Semiconductor Trade Measures Enacted",
    description:
      "Bilateral export limits on raw wafers and logic gates took effect, impacting electronic supplies across East Asian assembly corridors.",
    source: "Nikkei News",
    category: "news",
    publishedAt: ago(30.0), // 30h ago
    locationName: "Taipei, Taiwan",
    lat: 25.033,
    lng: 121.5654,
    intensity: 0.76,
  },
  {
    id: "ev-new-4",
    title: "Global Supply Chain Congestion Reports Rise",
    description:
      "Average container wait times have increased to 7.4 days due to localized strikes and canal reroutings near international trade bottlenecks.",
    source: "Bloomberg Trade",
    category: "news",
    publishedAt: ago(96.0), // 4d ago
    locationName: "Singapore Harbor",
    lat: 1.3521,
    lng: 103.8198,
    intensity: 0.62,
  },
];
