export const FALLBACK_LOGO = "/brand-logos/_fallback.svg";

// Maps a station's `brand` value (as stored in the DB) to a logo path under
// /public/brand-logos/. Add an entry here when you drop a new logo file
// into that folder — keys must match the DB brand string exactly.
export const BRAND_LOGOS: Record<string, string> = {
  "Circle K":      "/brand-logos/Circle_K.png",
  "Neste Lietuva": "/brand-logos/Neste.png",
  "Orlen":         "/brand-logos/Orlen.svg",
  "Emsi":          "/brand-logos/emsi.png",
  "Viada":         "/brand-logos/Viada.png",
};

export function getBrandLogo(brand: string): string {
  return BRAND_LOGOS[brand] ?? FALLBACK_LOGO;
}
