// Snory brand colors — derived from the logo identity
// Logo: sky-blue background (#5B9EC9) + bubbly cream-white wordmark

export const COLORS = {
  // ── Brand blue (logo background) ──────────────────────────────────────────
  primary:      "#5B9EC9",
  primaryDark:  "#4A8BB6",
  primaryLight: "#7BB8D9",
  primaryPale:  "#D6EDF8",
  primaryMuted: "#EBF4FA",

  // ── App backgrounds ────────────────────────────────────────────────────────
  background:   "#F4F9FC",
  surface:      "#FFFFFF",
  surfaceAlt:   "#F0F7FB",

  // ── Typography ─────────────────────────────────────────────────────────────
  text:          "#1A3347",
  textSecondary: "#4A6B82",
  textTertiary:  "#8AAFC4",
  textInverse:   "#FFFFFF",

  // ── Cream accent (logo wordmark) ───────────────────────────────────────────
  cream: "#FDF8F0",

  // ── Semantic ───────────────────────────────────────────────────────────────
  error:   "#E85C4A",
  success: "#4CAF82",
  warning: "#F5A623",

  // ── Borders ────────────────────────────────────────────────────────────────
  border:      "#DAEAF5",
  borderLight: "#EEF6FB",

  // ── Legacy aliases ─────────────────────────────────────────────────────────
  white:     "#FFFFFF",
  textLight: "#4A6B82",

  // ── Character palette ──────────────────────────────────────────────────────
  characters: {
    narrator: "#5B9EC9",
    girl:     "#E879A0",
    boy:      "#4B8FE8",
    dragon:   "#E85C4A",
    wizard:   "#8B5CF6",
    moral:    "#4CAF82",
    old_man:  "#8B6B47",
    old_woman:"#C084A8",
    woman:    "#E879A0",
    man:      "#4B8FE8",
    monster:  "#7C1D1D",
    fairy:    "#C084C8",
    creature: "#8B6B47",
    default:  "#F5A623",
  },
};

export default {
  light: {
    text:            COLORS.text,
    background:      COLORS.background,
    tint:            COLORS.primary,
    tabIconDefault:  COLORS.textTertiary,
    tabIconSelected: COLORS.primary,
  },
};
