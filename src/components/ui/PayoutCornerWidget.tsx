import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart2 } from "lucide-react";

type Offer = {
  offer_id?: string;
  name?: string;
  vertical?: string | string[];
  payout?: number | string;
  currency?: string;
  network?: string;
};

const COLORS = [
  "#ef4444",
  "#fb923c",
  "#f59e0b",
  "#06b6d4",
  "#7c3aed",
  "#10b981",
  "#ec4899",
  "#3b82f6",
];

function normalizePayout(raw: any) {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).replace(/[^0-9.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toVerticalString(v: string | string[] | undefined | null) {
  if (!v) return "Other";
  if (Array.isArray(v)) return v.join(", ") || "Other";
  return String(v) || "Other";
}

export default function PayoutCornerWidget({ offers = [] }: { offers?: Offer[] }) {
  const [open, setOpen] = useState(false);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of offers) {
      const key = toVerticalString(o.vertical);
      const p = normalizePayout(o.payout) || 0;
      map.set(key, (map.get(key) || 0) + (p || 1));
    }

    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    if (arr.length <= 6) return arr;
    const top = arr.slice(0, 5);
    const others = arr.slice(5).reduce((s, r) => s + r.value, 0);
    top.push({ name: "Other", value: others });
    return top;
  }, [offers]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const avgPayout = offers.length
    ? Math.round(
        (offers.reduce((s, o) => s + normalizePayout(o.payout), 0) / offers.length) * 100
      ) / 100
    : 0;
  const topVertical = data[0]?.name ?? "—";

  return (
    <div className="fixed right-4 bottom-6 z-50">
      <div
        className={`flex items-center transition-all duration-200 ease-out shadow-xl bg-white/6 backdrop-blur-md border border-white/10 dark:bg-black/30 dark:border-white/5 rounded-2xl p-2 ${
          open ? "w-64 h-40" : "w-44 h-44 rounded-full"
        }`}
        onClick={() => setOpen((s) => !s)}
      >
        <div className={`${open ? "w-28 h-28" : "w-36 h-36"} p-1`}>
          {total === 0 ? (
            <div className="flex items-center justify-center w-full h-full text-xs text-gray-300">
              No offers
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={open ? 36 : 46}
                  outerRadius={open ? 56 : 72}
                  paddingAngle={3}
                  isAnimationActive={true}
                >
                  {data.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {open && (
          <div className="ml-3 w-40">
            <div className="text-xs font-semibold">Payout distribution</div>
            <div className="text-[12px] mt-2">
              Total payout: <span className="font-medium">{Math.round(total)}</span>
            </div>
            <div className="text-[12px]">Avg payout: <span className="font-medium">{avgPayout}</span></div>
            <div className="text-[12px] mt-2">Top: <span className="font-medium">{topVertical}</span></div>
          </div>
        )}

        {!open && (
          <button
            title="Toggle payouts"
            className="absolute -top-2 -left-2 p-1 rounded-full bg-white/7 hover:bg-white/10 border border-white/5"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((s) => !s);
            }}
          >
            <BarChart2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
