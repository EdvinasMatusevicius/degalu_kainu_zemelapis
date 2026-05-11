"use client";

import { Fragment, useMemo, useState } from "react";

type TableRow = {
  brand: string;
  municipality: string;
  address: string;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
};

type SortColumn = "price95" | "priceDiesel" | "priceLpg";
type SortDir = "asc" | "desc";
type Sort = { column: SortColumn; dir: SortDir } | null;

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

export default function StationsList({ rows }: { rows: TableRow[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { column, dir } = sort;
    const sign = dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      // nulls always at the bottom regardless of direction
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (parseFloat(av) - parseFloat(bv)) * sign;
    });
  }, [rows, sort]);

  if (rows.length === 0) {
    return <p className="text-foreground/50 text-sm p-4">Nerasta stočių pagal paieškos užklausą.</p>;
  }

  const sortableHeader = `${textCell} text-right cursor-pointer select-none hover:bg-foreground/5`;

  return (
    <table className="border-collapse text-xs md:text-sm w-full">
      <thead className="sticky top-0 bg-background z-10">
        <tr>
          <th className={`${textCell} text-left`}>Tinklas</th>
          <th className={`${textCell} text-left`}>Savivaldybė</th>
          <th className={`${textCell} text-left`}>Adresas</th>
          <th
            className={sortableHeader}
            onClick={() => { setSort(nextSort(sort, "price95")); setExpanded(null); }}
          >
            A95<SortIndicator sort={sort} column="price95" />
          </th>
          <th
            className={sortableHeader}
            onClick={() => { setSort(nextSort(sort, "priceDiesel")); setExpanded(null); }}
          >
            D<SortIndicator sort={sort} column="priceDiesel" />
          </th>
          <th
            className={sortableHeader}
            onClick={() => { setSort(nextSort(sort, "priceLpg")); setExpanded(null); }}
          >
            LPG<SortIndicator sort={sort} column="priceLpg" />
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, i) => (
          <Fragment key={i}>
            <tr
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="cursor-pointer hover:bg-foreground/5"
            >
              <td className={textCell}><span className={truncated}>{row.brand}</span></td>
              <td className={textCell}><span className={truncated}>{row.municipality}</span></td>
              <td className={textCell}><span className={truncated}>{row.address}</span></td>
              <td className={`${textCell} text-right`}>{row.price95 ?? "—"}</td>
              <td className={`${textCell} text-right`}>{row.priceDiesel ?? "—"}</td>
              <td className={`${textCell} text-right`}>{row.priceLpg ?? "—"}</td>
            </tr>
            {expanded === i && (
              <tr className="md:hidden">
                <td colSpan={6} className="px-3 py-2 text-xs text-foreground/70 bg-foreground/5 border border-foreground/20">
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
