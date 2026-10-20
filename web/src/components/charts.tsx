// Sunucuda üretilen SVG grafikler: istemciye JavaScript göndermez, internet gerektirmez.
import { money, short } from "@/lib/format";
import { Empty } from "./ui";

export function BarChart({ id, data, height = 240 }: { id: string; data: { label: string; value: number; highlight?: boolean }[]; height?: number }) {
  if (!data.length) return <Empty>Veri yok.</Empty>;
  const w = 760, h = height, pt = 26, pb = 28;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = w / data.length;
  return (
    <svg className="chart block h-auto w-full" viewBox={`0 0 ${w} ${h}`} role="img">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} className="grid-line" x1={0} x2={w} y1={h - pb - t * (h - pt - pb)} y2={h - pb - t * (h - pt - pb)} />
      ))}
      {data.map((d, i) => {
        const bh = (d.value / max) * (h - pt - pb);
        const bwInner = Math.min(bw * 0.56, 38);
        const x = i * bw + (bw - bwInner) / 2, y = h - pb - bh, cx = i * bw + bw / 2;
        return (
          <g key={i}>
            <title>{`${d.label}: ${money(d.value)}`}</title>
            <rect x={i * bw} y={pt} width={bw} height={h - pt - pb} fill="transparent" />
            <rect x={x} y={h - pb - (h - pt - pb)} width={bwInner} height={h - pt - pb} rx={10} fill="var(--surface-2)" />
            <rect x={x} y={y} width={bwInner} height={Math.max(bh, 2)} rx={10} fill={`url(#${id})`} opacity={d.highlight === false ? 0.45 : 1} />
            {d.value > 0 && <text x={cx} y={y - 8} textAnchor="middle" style={{ fontWeight: 600 }}>{short(d.value)}</text>}
            <text x={cx} y={h - 8} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function AreaChart({ id, labels, series, height = 250 }: { id: string; labels: string[]; series: { name: string; color: string; values: number[]; fill?: boolean }[]; height?: number }) {
  if (!labels.length) return <Empty>Veri yok.</Empty>;
  const w = 760, h = height, pl = 52, pr = 12, pt = 14, pb = 28;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1) * 1.08, min = Math.min(0, ...all);
  const x = (i: number) => (labels.length === 1 ? (pl + w - pr) / 2 : pl + (i * (w - pl - pr)) / (labels.length - 1));
  const y = (v: number) => pt + (1 - (v - min) / (max - min)) * (h - pt - pb);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  const step = Math.ceil(labels.length / 8);
  return (
    <>
      <svg className="chart block h-auto w-full" viewBox={`0 0 ${w} ${h}`} role="img">
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`${id}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="grid-line" x1={pl} x2={w - pr} y1={y(t)} y2={y(t)} />
            <text x={pl - 10} y={y(t) + 4} textAnchor="end">{short(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % step === 0 && <text key={i} x={x(i)} y={h - 8} textAnchor="middle">{l}</text>)}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.name}>
              {s.fill !== false && labels.length > 1 && (
                <polygon fill={`url(#${id}-${si})`} points={`${x(0)},${y(min)} ${pts} ${x(s.values.length - 1)},${y(min)}`} />
              )}
              <polyline fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={pts} />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={labels.length > 30 ? 0 : 3.5} fill="var(--surface)" stroke={s.color} strokeWidth={2}>
                  <title>{`${labels[i]} · ${s.name}: ${money(v)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.name, color: s.color }))} />}
    </>
  );
}

/** Halka grafik; ortasında toplam gösterilir. */
export function Donut({ data, size = 180, centerLabel, centerValue }: {
  data: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string; centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 42, c = 2 * Math.PI * r, gap = data.filter((d) => d.value > 0).length > 1 ? 0.6 : 0;
  let offset = 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={11} />
        {total > 0 && data.filter((d) => d.value > 0).map((d) => {
          const len = (d.value / total) * c;
          const el = (
            <circle key={d.label} cx={50} cy={50} r={r} fill="none" stroke={d.color} strokeWidth={11}
              strokeDasharray={`${Math.max(len - gap * 2, 0.1)} ${c}`} strokeDashoffset={-offset - gap}>
              <title>{`${d.label}: ${money(d.value)}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 grid place-content-center text-center">
          {centerLabel && <div className="text-[11.5px] text-muted">{centerLabel}</div>}
          {centerValue && <div className="tabular text-[15px] font-bold tracking-tight">{centerValue}</div>}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-2">
          <i className="inline-block size-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
          {it.value && <b className="tabular font-semibold text-fg">{it.value}</b>}
        </span>
      ))}
    </div>
  );
}
