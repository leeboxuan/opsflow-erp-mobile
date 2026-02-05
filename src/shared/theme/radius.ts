export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  /** 18dp card radius for premium look */
  card: 18,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
