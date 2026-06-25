import type { NewsEvent } from "@/types/news";

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export const mockNewsEvents: NewsEvent[] = [
  // ── BREAKING NEWS (Electric Fuchsia) ──
  {
    id: "ev-break-1",
    title: "Critical Vulnerability Discovered in Global DNS Infrastructure",
    description:
      "A zero-day exploit targeting BIND9 servers has been disclosed, allowing remote cache poisoning. Cybersecurity agencies worldwide have issued urgent patch mandates.",
    source: "CyberDefense Agency",
    category: "breaking",
    publishedAt: ago(0.4), // 24m ago
    locationName: "New Delhi, Delhi",
    lat: 28.6139,
    lng: 77.209,
    intensity: 0.95,
  },
  {
    id: "ev-break-2",
    title: "Emergency Port Lockout Halts Maritime Operations",
    description:
      "A sudden grid outage at the Nhava Sheva port facility has frozen container tracking systems. Cargo vessels are stranded anchor-side off the Mumbai harbor.",
    source: "Maritime Log",
    category: "breaking",
    publishedAt: ago(0.8), // 48m ago
    locationName: "Navi Mumbai, Maharashtra",
    lat: 18.95,
    lng: 72.95,
    intensity: 0.9,
  },
  {
    id: "ev-break-3",
    title: "Central Bank Announces Emergency Inter-Bank Liquidity Injection",
    description:
      "Following a sudden foreign capital outflow, the Reserve Bank of India has opened an overnight liquidity window to stabilize short-term call rates.",
    source: "Financial Bulletin",
    category: "breaking",
    publishedAt: ago(1.5), // 1.5h ago
    locationName: "Mumbai, Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    intensity: 0.88,
  },

  // ── PROTESTS (Safety Orange) ──
  {
    id: "ev-prot-1",
    title: "Logistics Workers Strike Blocks Major Inner-Ring Expressways",
    description:
      "Thousands of transport workers have blockaded key entry lanes of the Outer Ring Road in Bengaluru, demanding digital freight-matching platform rate regulation.",
    source: "City Logistics Tracker",
    category: "protests",
    publishedAt: ago(2.2), // 2.2h ago
    locationName: "Bengaluru, Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    intensity: 0.76,
  },
  {
    id: "ev-prot-2",
    title: "Farmers Assembly Gathers Near Highway Toll Booths",
    description:
      "Farmer unions have launched sit-ins at toll plazas along the Delhi-Noida Expressway, demanding minimum support price assurances on oilseeds.",
    source: "NCR Commute Live",
    category: "protests",
    publishedAt: ago(4.5), // 4.5h ago
    locationName: "Noida, Uttar Pradesh",
    lat: 28.5355,
    lng: 77.391,
    intensity: 0.7,
  },
  {
    id: "ev-prot-3",
    title: "Public Demonstration Against Water Allocation Cutbacks",
    description:
      "Civic groups have gathered outside municipal offices in Chennai protesting water supply reductions to outlying residential sectors.",
    source: "Madras Tribune",
    category: "protests",
    publishedAt: ago(18.0), // 18h ago
    locationName: "Chennai, Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    intensity: 0.65,
  },
  {
    id: "ev-prot-4",
    title: "Dockworkers Stoppage Slows Container Unloading",
    description:
      "Port workers in Kolkata have started a 24-hour token strike demanding improved shifts and healthcare coverage during seasonal monsoons.",
    source: "Eastern Shipping News",
    category: "protests",
    publishedAt: ago(48.0), // 2d ago
    locationName: "Kolkata, West Bengal",
    lat: 22.5726,
    lng: 88.3639,
    intensity: 0.58,
  },

  // ── DISASTERS (Crimson Red) ──
  {
    id: "ev-dis-1",
    title: "Severe Urban Inundation After Record Pre-Monsoon Downpour",
    description:
      "A sudden cloudburst has released 110mm of rainfall in under 3 hours. Whitefield, Indiranagar, and Bellandur roads are experiencing severe waterlogging and power outages.",
    source: "Met Forecast India",
    category: "disasters",
    publishedAt: ago(3.0), // 3h ago
    locationName: "Bengaluru, Karnataka",
    lat: 12.982,
    lng: 77.751,
    intensity: 0.85,
  },
  {
    id: "ev-dis-2",
    title: "Industrial Storage Facility Chemical Spill",
    description:
      "A tank leak at an chemical depot near the outer harbor has prompted local containment procedures. Air monitoring units show minor, localized organic vapours.",
    source: "Environment Watch",
    category: "disasters",
    publishedAt: ago(11.2), // 11.2h ago
    locationName: "Visakhapatnam, Andhra Pradesh",
    lat: 17.6868,
    lng: 83.2185,
    intensity: 0.78,
  },
  {
    id: "ev-dis-3",
    title: "Moderate Earth Tremor Recorded in Himalayan Foothills",
    description:
      "An earthquake of magnitude 4.8 occurred at a depth of 10km. Minor cracks reported in masonry structures in Shimla and adjoining mountain towns.",
    source: "Geological Survey",
    category: "disasters",
    publishedAt: ago(36.0), // 1.5d ago
    locationName: "Shimla, Himachal Pradesh",
    lat: 31.1048,
    lng: 77.1734,
    intensity: 0.72,
  },
  {
    id: "ev-dis-4",
    title: "River Embankment Erosion Floods Low-lying Farmland",
    description:
      "Recent surges in water release from northern reservoirs have breached a 50-meter section of the rural embankment, displacing agricultural communities.",
    source: "Assam Daily News",
    category: "disasters",
    publishedAt: ago(120.0), // 5d ago
    locationName: "Guwahati, Assam",
    lat: 26.1445,
    lng: 91.7362,
    intensity: 0.64,
  },

  // ── POLITICS (Royal Blue) ──
  {
    id: "ev-pol-1",
    title: "Bilateral Silicon Chip Agreement Drafted",
    description:
      "Foreign trade delegates in New Delhi have signed a memorandum of cooperation, aligning supply-chain safety targets and technology joint-ventures.",
    source: "Diplomatic Affairs",
    category: "politics",
    publishedAt: ago(5.0), // 5h ago
    locationName: "New Delhi, Delhi",
    lat: 28.6144,
    lng: 77.201,
    intensity: 0.75,
  },
  {
    id: "ev-pol-2",
    title: "State Assembly Approves Municipal Tax Restructuring Bill",
    description:
      "The Maharashtra assembly has passed a resolution transferring property assessment updates to an automated digital satellite appraisal model.",
    source: "Legislative Gazette",
    category: "politics",
    publishedAt: ago(20.5), // 20.5h ago
    locationName: "Mumbai, Maharashtra",
    lat: 19.01,
    lng: 72.85,
    intensity: 0.62,
  },
  {
    id: "ev-pol-3",
    title: "National Cyber Agency Drafts Cross-Border Privacy Guidelines",
    description:
      "A draft ordinance released today restricts local caching of financial profiles by foreign service providers unless hosted on certified sovereign servers.",
    source: "Federal Gazette",
    category: "politics",
    publishedAt: ago(55.0), // 2.3d ago
    locationName: "New Delhi, Delhi",
    lat: 28.622,
    lng: 77.234,
    intensity: 0.8,
  },
  {
    id: "ev-pol-4",
    title: "High-level Trade Summit Organized in Hyderabad",
    description:
      "Representatives from Singapore, UAE, and Germany meet to establish a joint technology corridor and special economic zone for aerospace engineering.",
    source: "Hyderabad Business Record",
    category: "politics",
    publishedAt: ago(140.0), // 5.8d ago
    locationName: "Hyderabad, Telangana",
    lat: 17.385,
    lng: 78.4867,
    intensity: 0.71,
  },

  // ── ECONOMY (Emerald Mint) ──
  {
    id: "ev-econ-1",
    title: "Sovereign Bond Auction Reports Unprecedented Institutional Inflow",
    description:
      "Yields on Indian 10-year benchmark bonds drop to a three-month low of 6.84% following strong purchase orders from global pension funds.",
    source: "Markets Intelligence",
    category: "economy",
    publishedAt: ago(5.5), // 5.5h ago
    locationName: "Mumbai, Maharashtra",
    lat: 19.03,
    lng: 72.86,
    intensity: 0.82,
  },
  {
    id: "ev-econ-2",
    title: "Semiconductor Assembly Plant Secures Sovereign Subsidy",
    description:
      "A consortium has received final clearance for a $1.2B assembly plant under the domestic manufacturing initiative. Breaking ground scheduled next month.",
    source: "Industrial Bulletin",
    category: "economy",
    publishedAt: ago(23.0), // 23h ago
    locationName: "Ahmedabad, Gujarat",
    lat: 23.0225,
    lng: 72.5714,
    intensity: 0.78,
  },
  {
    id: "ev-econ-3",
    title: "Retail Inflation Index Ticks Up on Transport Costs",
    description:
      "The core consumer price index has increased slightly to 4.3% due to fuel price updates and logistics constraints along western freight tracks.",
    source: "Apex Business News",
    category: "economy",
    publishedAt: ago(74.0), // 3.1d ago
    locationName: "Pune, Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    intensity: 0.67,
  },
  {
    id: "ev-econ-4",
    title: "Fintech Conglomerate Establishes Regional Center in GIFT City",
    description:
      "A major payment gateway provider has acquired a commercial tower block inside the financial tech zone to establish its international operations hub.",
    source: "Gujarat Monitor",
    category: "economy",
    publishedAt: ago(160.0), // 6.6d ago
    locationName: "Gandhinagar, Gujarat",
    lat: 23.2156,
    lng: 72.6369,
    intensity: 0.72,
  },

  // ── TECH / CYBER (Neon Cyan) ──
  {
    id: "ev-tech-1",
    title: "Local Quantum Cryptography Testbed Declared Operational",
    description:
      "Engineers have completed a fiber-optic quantum key distribution link spanning 120km, demonstrating tamper-proof routing for governmental secure systems.",
    source: "Indian Science Wire",
    category: "tech",
    publishedAt: ago(1.8), // 1.8h ago
    locationName: "Bengaluru, Karnataka",
    lat: 12.975,
    lng: 77.58,
    intensity: 0.81,
  },
  {
    id: "ev-tech-2",
    title: "AI Co-processor Startup Gathers $150M Venture Allocation",
    description:
      "An chip-design startup in Gurugram has completed a Series C funding round to scale development of specialized inference processors tailored for automated vision models.",
    source: "Venture Report India",
    category: "tech",
    publishedAt: ago(7.2), // 7.2h ago
    locationName: "Gurugram, Haryana",
    lat: 28.4595,
    lng: 77.0266,
    intensity: 0.74,
  },
  {
    id: "ev-tech-3",
    title: "Smart Grid Command System Launches Trial Phase",
    description:
      "The local electrical utility has deployed a machine-learning control system to forecast load surges and automate substation switches in real time.",
    source: "Grid Operator Journal",
    category: "tech",
    publishedAt: ago(25.5), // 25.5h (1.1d) ago
    locationName: "Hyderabad, Telangana",
    lat: 17.41,
    lng: 78.51,
    intensity: 0.68,
  },
  {
    id: "ev-tech-4",
    title: "Maritime Autonomous Shipping Trial Completed Successfully",
    description:
      "An autonomous cargo barge navigated the shipping canal under dense fog conditions using lidar systems and local radar arrays.",
    source: "Coastline Tech",
    category: "tech",
    publishedAt: ago(92.0), // 3.8d ago
    locationName: "Kochi, Kerala",
    lat: 9.9312,
    lng: 76.2673,
    intensity: 0.63,
  },
];
