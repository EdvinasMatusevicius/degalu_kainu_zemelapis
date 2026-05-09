"use client";

import { Fragment, useState } from "react";

type TableRow = {
  brand: string;
  municipality: string;
  address: string;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
};

const textCell = "border border-foreground/20 px-2 py-1.5 md:px-3 md:py-2";
const truncated = "block truncate max-w-[5rem] md:max-w-none md:overflow-visible md:whitespace-normal";

export default function StationsList({ rows }: { rows: TableRow[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (rows.length === 0) {
    return <p className="text-foreground/50 text-sm p-4">Nerasta stočių pagal paieškos užklausą.</p>;
  }

  return (
    <table className="border-collapse text-xs md:text-sm w-full">
      <thead className="sticky top-0 bg-background z-10">
        <tr>
          <th className={`${textCell} text-left`}>Tinklas</th>
          <th className={`${textCell} text-left`}>Savivaldybė</th>
          <th className={`${textCell} text-left`}>Adresas</th>
          <th className={`${textCell} text-right`}>A95</th>
          <th className={`${textCell} text-right`}>D</th>
          <th className={`${textCell} text-right`}>LPG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
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
