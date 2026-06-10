"use client";

import { Fragment, useMemo, useState } from "react";
import type { FuelKey } from "./StationsView";
import { useFavorites } from "./useFavorites";
import FavoriteStar from "./FavoriteStar";

type TableRow = {
  id: number;
  brand: string;
  municipality: string;
  address: string;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
};

function MapPinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

type SortColumn = "price95" | "priceDiesel" | "priceLpg";
type SortDir = "asc" | "desc";
type Sort = { column: SortColumn; dir: SortDir } | null;

const FUEL_COLUMN: Record<Exclude<FuelKey, "all">, SortColumn> = {
  a95:     "price95",
  dyzelis: "priceDiesel",
  lpg:     "priceLpg",
};

const textCell = "border border-foreground/20 px-2 py-1.5 md:px-3 md:py-2";
const truncated = "block truncate max-w-[5rem] md:max-w-none md:overflow-visible md:whitespace-normal";

// asc → desc → off
function nextSort(current: Sort, column: SortColumn): Sort {
  if (current?.column !== column) return { column, dir: "asc" };
  if (current.dir === "asc") return { column, dir: "desc" };
  return null;
}

function SortIndicator({ sort, column }: { sort: Sort; column: SortColumn }) {
  const active = sort?.column === column;
  const upOpacity  = active && sort.dir === "asc"  ? 1 : 0.25;
  const downOpacity = active && sort.dir === "desc" ? 1 : 0.25;
  return (
    <span className="inline-flex flex-col leading-[0.75] ml-1 text-[0.95em] align-middle">
      <span style={{ opacity: upOpacity }}>▲</span>
      <span style={{ opacity: downOpacity }}>▼</span>
    </span>
  );
}

type Props = {
  rows: TableRow[];
  fuel: FuelKey;
  mappableIds: Set<number>;
  onFocusStation: (id: number) => void;
};

export default function StationsList({ rows, fuel, mappableIds, onFocusStation }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>(null);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const { favorites } = useFavorites();

  const show95     = fuel === "all" || FUEL_COLUMN[fuel] === "price95";
  const showDiesel = fuel === "all" || FUEL_COLUMN[fuel] === "priceDiesel";
  const showLpg    = fuel === "all" || FUEL_COLUMN[fuel] === "priceLpg";

  // Inline style so we can animate max-width / padding / border-width / opacity.
  // colSpan changes can't animate, so we keep the column rendered and squash it instead.
  const addressColStyle: React.CSSProperties = {
    transition: "max-width 300ms ease, padding 300ms ease, border-width 300ms ease, opacity 200ms ease",
    overflow: "hidden",
    ...(locationExpanded
      ? { maxWidth: "40rem", opacity: 1 }
      : { maxWidth: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0, opacity: 0 }),
  };

  const sortedRows = useMemo(() => {
    // Within-group price comparison; 0 when no sort is active so the array's
    // stable order (brand/municipality from the query) is preserved.
    const byPrice = (a: TableRow, b: TableRow) => {
      if (!sort) return 0;
      const { column, dir } = sort;
      const sign = dir === "asc" ? 1 : -1;
      const av = a[column];
      const bv = b[column];
      // nulls always at the bottom regardless of direction
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (parseFloat(av) - parseFloat(bv)) * sign;
    };

    // Favorites form their own block at the top; the active price sort then
    // orders stations *within* each block (favorites, then the rest).
    return [...rows].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return byPrice(a, b);
    });
  }, [rows, sort, favorites]);

  if (rows.length === 0) {
    return <p className="text-foreground/50 text-sm p-4">Nerasta stočių pagal paieškos užklausą.</p>;
  }

  const sortableHeader = `${textCell} text-right cursor-pointer select-none hover:bg-foreground/5`;

  return (
    <table className="border-collapse text-xs md:text-sm w-full">
      <thead className="sticky top-0 bg-background z-10">
        <tr>
          <th className={`${textCell} text-center w-8 text-foreground/40`} aria-label="Mėgstami">★</th>
          <th className={`${textCell} text-left`}>Tinklas</th>
          <th
            className={`${textCell} text-left cursor-pointer select-none hover:bg-foreground/5`}
            onClick={() => setLocationExpanded((v) => !v)}
            title={locationExpanded ? "Suskleisti" : "Išskleisti"}
          >
            {locationExpanded ? "Savivaldybė" : <>Lokacija <span className="text-foreground/60">▶</span></>}
          </th>
          <th className={`${textCell} text-left`} style={addressColStyle}>
            <span className="inline-flex items-center justify-between w-full gap-2">
              <span>Adresas</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLocationExpanded(false); }}
                className="text-foreground/60 hover:text-foreground cursor-pointer"
                title="Suskleisti"
              >
                ◀
              </button>
            </span>
          </th>
          {show95 && (
            <th
              className={sortableHeader}
              onClick={() => { setSort(nextSort(sort, "price95")); setExpanded(null); }}
            >
              A95<SortIndicator sort={sort} column="price95" />
            </th>
          )}
          {showDiesel && (
            <th
              className={sortableHeader}
              onClick={() => { setSort(nextSort(sort, "priceDiesel")); setExpanded(null); }}
            >
              D<SortIndicator sort={sort} column="priceDiesel" />
            </th>
          )}
          {showLpg && (
            <th
              className={sortableHeader}
              onClick={() => { setSort(nextSort(sort, "priceLpg")); setExpanded(null); }}
            >
              LPG<SortIndicator sort={sort} column="priceLpg" />
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, i) => (
          <Fragment key={i}>
            <tr
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="cursor-pointer hover:bg-foreground/5"
            >
              <td className={`${textCell} text-center`}>
                <FavoriteStar id={row.id} />
              </td>
              <td className={textCell}>
                {mappableIds.has(row.id) ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onFocusStation(row.id); }}
                    className="inline-flex items-center gap-1.5 cursor-pointer hover:text-foreground/70 text-left w-full"
                    title="Rodyti žemėlapyje"
                  >
                    <MapPinIcon />
                    <span className={truncated}>{row.brand}</span>
                  </button>
                ) : (
                  <span className={truncated}>{row.brand}</span>
                )}
              </td>
              <td
                className={`${textCell} ${!locationExpanded ? "cursor-pointer" : ""}`}
                onClick={
                  !locationExpanded
                    ? (e) => { e.stopPropagation(); setLocationExpanded(true); }
                    : undefined
                }
              >
                <span className={truncated}>{row.municipality}</span>
              </td>
              <td className={textCell} style={addressColStyle}>
                <span className={truncated}>{row.address}</span>
              </td>
              {show95     && <td className={`${textCell} text-right`}>{row.price95 ?? "—"}</td>}
              {showDiesel && <td className={`${textCell} text-right`}>{row.priceDiesel ?? "—"}</td>}
              {showLpg    && <td className={`${textCell} text-right`}>{row.priceLpg ?? "—"}</td>}
            </tr>
            {expanded === i && (
              <tr className="md:hidden">
                <td colSpan={4 + Number(show95) + Number(showDiesel) + Number(showLpg)} className="px-3 py-2 text-xs text-foreground/70 bg-foreground/5 border border-foreground/20">
                  {row.municipality} — {row.address}
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
