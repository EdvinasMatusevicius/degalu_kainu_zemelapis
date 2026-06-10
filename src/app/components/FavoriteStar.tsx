"use client";

import { useFavorites } from "./useFavorites";

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

type Props = {
  id: number;
  size?: number;
  // Colors are overridable so the same button works on the dark app background
  // (table) and on the white map popup, where foreground-based tones vanish.
  activeClass?: string;
  inactiveClass?: string;
};

export default function FavoriteStar({
  id,
  size = 16,
  activeClass = "text-amber-400 hover:text-amber-300",
  inactiveClass = "text-foreground/25 hover:text-foreground/60",
}: Props) {
  const { favorites, toggleFavorite } = useFavorites();
  const isFav = favorites.has(id);

  return (
    <button
      type="button"
      // stopPropagation so the surrounding row / map pill doesn't react to the tap.
      onClick={(e) => { e.stopPropagation(); toggleFavorite(id); }}
      className={`cursor-pointer align-middle transition-colors ${isFav ? activeClass : inactiveClass}`}
      title={isFav ? "Pašalinti iš mėgstamų" : "Pridėti į mėgstamus"}
      aria-label={isFav ? "Pašalinti iš mėgstamų" : "Pridėti į mėgstamus"}
      aria-pressed={isFav}
    >
      <StarIcon filled={isFav} size={size} />
    </button>
  );
}
