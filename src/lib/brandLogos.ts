export const FALLBACK_LOGO = "/brand-logos/_fallback.svg";

// Maps a station's `brand` value to a logo path under /public/brand-logos/.
// Add an entry here when you drop a new logo file into that folder.
export const BRAND_LOGOS: Record<string, string> = {
  // "Circle K": "/brand-logos/circle-k.svg",
  // "Viada": "/brand-logos/viada.svg",
  // "Orlen": "/brand-logos/orlen.svg",
  // "Neste Lietuva": "/brand-logos/neste.svg",
};

export function getBrandLogo(brand: string): string {
  return BRAND_LOGOS[brand] ?? FALLBACK_LOGO;
}
