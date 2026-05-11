export const FALLBACK_LOGO = "/brand-logos/_fallback.svg";

// Maps a station's `brand` value (as stored in the DB) to a logo path under
// /public/brand-logos/. Add an entry here when you drop a new logo file
// into that folder — keys must match the DB brand string exactly.
export const BRAND_LOGOS: Record<string, string> = {
  "Adukesta":                         "/brand-logos/adukesta.png",
  "Alauša":                           "/brand-logos/alausa.png",
  "Apsaga":                           "/brand-logos/apsaga.png",
  "Baltic Petroleum":                 "/brand-logos/balticpetroleum.png",
  "Boost Petrol":                     "/brand-logos/boostpetrol.png",
  "Borusta":                          "/brand-logos/borusta.png",
  "Circle K":                         "/brand-logos/circlek.png",
  "GM Circle K":                      "/brand-logos/circlek.png",
  "Degta":                            "/brand-logos/degta.png",
  "Deliuvis":                         "/brand-logos/deliuvis.png",
  "Emsi":                             "/brand-logos/emsi.png",
  "Gazimpeksas":                      "/brand-logos/gazimpeksas.png",
  "Gelvybė":                          "/brand-logos/gelvybe.png",
  "Jozita":                           "/brand-logos/jozita.png",
  "Junasa":                           "/brand-logos/junasa.png",
  "Melkasta":                         "/brand-logos/melkasta.png",
  "Naftrus":                          "/brand-logos/naftrus.png",
  "Narjanta":                         "/brand-logos/narjanta.png",
  "Neste Lietuva":                    "/brand-logos/neste.png",
  "Nostrada (RV Transport)":          "/brand-logos/nostrada.png",
  "Orlen":                            "/brand-logos/orlen.png",
  "Propano ir butano dujų centras":   "/brand-logos/propanoirbutanodujucentras.png",
  "Pynauja":                          "/brand-logos/pynauja.png",
  "Regusa":                           "/brand-logos/regusa.png",
  "RV":                               "/brand-logos/RV.png",
  "Saurida":                          "/brand-logos/saurida.png",
  "Skulas":                           "/brand-logos/skulas.png",
  "Stateta":                          "/brand-logos/stateta.png",
  "Šventosios investicijos":          "/brand-logos/sventosiosinvesticijos.png",
  "Tomega":                           "/brand-logos/tomega.png",
  "Trevena":                          "/brand-logos/trevena.png",
  "Utentra":                          "/brand-logos/utentra.png",
  "Velseka":                          "/brand-logos/velseka.png",
  "Viada":                            "/brand-logos/viada.png",
  "Virši":                            "/brand-logos/virsi.png",
};

export function getBrandLogo(brand: string): string {
  return BRAND_LOGOS[brand] ?? FALLBACK_LOGO;
}
