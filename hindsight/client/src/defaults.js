/* Mirrors the server's DEFAULT_APPEARANCE so the UI renders instantly
   before the settings request returns. */
export const DEFAULTS = {
  preset: "classic",
  textScale: 1,
  ratings: {
    green: { color: "#2E7D5B", label: "Worth it" },
    yellow: { color: "#D99A1F", label: "It's fine" },
    red: { color: "#C0432C", label: "Regret it" },
  },
};
