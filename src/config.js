// src/config.js
// WVUSD SBAC Longitudinal Data Portal Configuration

export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFVWPdEdw50Y3kuubNsbLUnsvMiWg29grpR5ASlbpQFVdZIIaasAhNXD09qPINudig/exec";
export const GOOGLE_CLIENT_ID = "243489966839-kcopbaj692oat1p2hoq5lrcddq9n4k17.apps.googleusercontent.com";

export const ALLOWED_DOMAINS = ["wvusd.org", "sub.wvusd.org"];

export const DISTRICT_NAME = "Walnut Valley Unified School District";
export const APP_TITLE = "WVUSD SBAC Longitudinal Data Portal";

export const DISTRICT_LOGO =
  "https://res.cloudinary.com/djv9u4054/image/upload/v1783959106/UPdated_Black_and_White_Logo-removebg-preview_zubeqp.png";

export const SITE_LOGOS = {
  "diamond bar": "https://res.cloudinary.com/djv9u4054/image/upload/v1783632852/0-DBARBRAHMASWide_q8uled-removebg-preview_x7ta88.png",
  "south pointe": "https://res.cloudinary.com/djv9u4054/image/upload/v1783623577/copy_of_copy_of_spt_logo-removebg-preview_l7eve6.png",
  "maple hill": "https://res.cloudinary.com/djv9u4054/image/upload/v1783459666/copy_of_untitled_design_6_qhbikx.png",
  "chaparral": "https://res.cloudinary.com/djv9u4054/image/upload/v1781797508/CHP_Logo-removebg-preview_npea0e.png",
  "suzanne": "https://res.cloudinary.com/djv9u4054/image/upload/v1780597225/Suzanne_iqsuyo.png",
  "walnut high": "https://res.cloudinary.com/djv9u4054/image/upload/v1780504988/stickerwhs_iwwwxs_rx0om9.png",
  "hockwalt": "https://res.cloudinary.com/djv9u4054/image/upload/v1777564560/Untitled_design_4_tjyhnp.png",
  "collegewood": "https://res.cloudinary.com/djv9u4054/image/upload/v1777485387/Untitled_design_14_on26t9.png",
  "vejar": "https://res.cloudinary.com/djv9u4054/image/upload/v1777485064/Untitled_design_13_ohnd95.png",
  "castle rock": "https://res.cloudinary.com/djv9u4054/image/upload/v1777486030/Untitled_design_15_dt6zmq.png",
  "evergreen": "https://res.cloudinary.com/djv9u4054/image/upload/v1777484631/Untitled_design_12_le66tp.png",
  "quail summit": "https://res.cloudinary.com/djv9u4054/image/upload/v1777484271/Untitled_design_11_bd8mmm.png",
  "walnut elementary": "https://res.cloudinary.com/djv9u4054/image/upload/v1777483405/Untitled_design_10_imwook.png",
  "westhoff": "https://res.cloudinary.com/djv9u4054/image/upload/v1777482954/Untitled_design_9_pkf2df.png",
  "morris": "https://res.cloudinary.com/djv9u4054/image/upload/v1777482304/Untitled_design_7_kyzokr.png"
};

/**
 * Resolves a school site name to its official logo
 */
export function getSiteLogo(siteName) {
  if (!siteName || siteName === "ALL") return DISTRICT_LOGO;
  const lower = String(siteName).toLowerCase();
  if (lower.includes("walnut") && !lower.includes("high")) {
    return SITE_LOGOS["walnut elementary"];
  }
  for (const [key, url] of Object.entries(SITE_LOGOS)) {
    if (lower.includes(key)) return url;
  }
  return DISTRICT_LOGO;
}

/**
 * Checks whether an email address is an authorized staff account
 */
export function isValidWvusdEmail(email) {
  if (!email) return false;
  const clean = String(email).toLowerCase().trim();
  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  // Disallow student emails
  if (parts[1] === "stu.wvusd.org") return false;
  return ALLOWED_DOMAINS.includes(parts[1]);
}

/**
 * Standard California Smarter Balanced Performance Levels
 */
export const PERFORMANCE_LEVELS = {
  1: {
    level: 1,
    label: "Standard Not Met",
    shortLabel: "Level 1",
    tierName: "Intensive Support",
    color: "#ef4444",
    bgClass: "bg-red-50 text-red-700 border-red-200",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
    barColor: "bg-red-500",
    dotColor: "bg-red-500",
  },
  2: {
    level: 2,
    label: "Standard Nearly Met",
    shortLabel: "Level 2",
    tierName: "Strategic Support / Bubble",
    color: "#f59e0b",
    bgClass: "bg-amber-50 text-amber-700 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    barColor: "bg-amber-500",
    dotColor: "bg-amber-500",
  },
  3: {
    level: 3,
    label: "Standard Met",
    shortLabel: "Level 3",
    tierName: "Benchmark Proficient",
    color: "#10b981",
    bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    barColor: "bg-emerald-500",
    dotColor: "bg-emerald-500",
  },
  4: {
    level: 4,
    label: "Standard Exceeded",
    shortLabel: "Level 4",
    tierName: "Advanced Enrichment",
    color: "#2563eb",
    bgClass: "bg-blue-50 text-blue-700 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    barColor: "bg-blue-600",
    dotColor: "bg-blue-600",
  }
};

/**
 * California SBAC Scale Score Thresholds (Grade 3 to Grade 11)
 * [Level 2 Min, Level 3 Min (Standard Met), Level 4 Min]
 */
export const SBAC_CUT_SCORES = {
  ELA: {
    3: [2367, 2432, 2490],
    4: [2416, 2473, 2533],
    5: [2442, 2502, 2582],
    6: [2457, 2531, 2618],
    7: [2479, 2552, 2649],
    8: [2487, 2567, 2668],
    11: [2493, 2583, 2682]
  },
  Math: {
    3: [2381, 2436, 2501],
    4: [2411, 2485, 2549],
    5: [2455, 2528, 2579],
    6: [2473, 2552, 2610],
    7: [2484, 2567, 2635],
    8: [2504, 2586, 2653],
    11: [2543, 2628, 2718]
  }
};

/**
 * Helper to determine if a student is a "Bubble Student":
 * In Level 2 (Standard Nearly Met) and within 25 scale score points of Level 3 (Standard Met)
 * or displaying strong positive momentum.
 */
export function isBubbleStudent(score, grade, subject) {
  if (!score || !grade) return false;
  const cuts = SBAC_CUT_SCORES[subject]?.[grade];
  if (!cuts) return false;
  const [minL2, minL3] = cuts;
  // If score is in Level 2 and within 25 points of Level 3
  return score >= minL2 && score < minL3 && (minL3 - score) <= 25;
}

/**
 * Returns distance from standard (DFS):
 * Positive = above Level 3 threshold, Negative = below Level 3 threshold
 */
export function getDistanceToStandard(score, grade, subject) {
  if (!score || !grade) return null;
  const cuts = SBAC_CUT_SCORES[subject]?.[grade];
  if (!cuts) return null;
  const minL3 = cuts[1];
  return score - minL3;
}
