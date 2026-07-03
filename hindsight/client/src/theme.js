/* Base UI tokens (neutral chrome — the rating colors come from settings) */
export const C = {
  paper: "#F4F6F4",
  card: "#FFFFFF",
  ink: "#1C2422",
  muted: "#7D8783",
  line: "#E3E8E5",
  unrated: "#CBD2CE",
};

/* Blend any hex color toward white so every custom color gets a matching
   soft background automatically — the user only ever picks one color. */
export function soften(hex, amount = 0.88) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v) => Math.round(v + (255 - v) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* Build the RATINGS object the whole app uses from saved appearance. */
export function buildRatings(appearance) {
  const out = {};
  for (const k of ["green", "yellow", "red"]) {
    const { color, label } = appearance.ratings[k];
    out[k] = { color, soft: soften(color), label };
  }
  return out;
}

/* Presets. "Colorblind-friendly" uses the Okabe–Ito palette, designed to
   stay distinguishable for the most common types of color vision deficiency.
   Labels are always shown next to colors everywhere in the app, so no one
   ever has to rely on color alone. */
export const PRESETS = {
  classic: {
    name: "Classic",
    ratings: {
      green: { color: "#2E7D5B" },
      yellow: { color: "#D99A1F" },
      red: { color: "#C0432C" },
    },
  },
  colorblind: {
    name: "Colorblind-friendly",
    ratings: {
      green: { color: "#0072B2" }, // blue
      yellow: { color: "#E69F00" }, // amber
      red: { color: "#D55E00" }, // vermillion
    },
  },
  contrast: {
    name: "High contrast",
    ratings: {
      green: { color: "#1B5E20" },
      yellow: { color: "#8A6D00" },
      red: { color: "#8E1600" },
    },
  },
};

export const TEXT_SIZES = [
  { value: 1, label: "Cozy" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Extra large" },
];
