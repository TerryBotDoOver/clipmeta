/**
 * Capability signal bar — shows concrete product facts, not user/clip counts.
 * No AI vendor disclosed; no scale numbers that could read as "small."
 */
export function StatsBar() {
  const items: { n: string; label: string }[] = [
    { n: "4", label: "Stock Platforms" },
    { n: "50+", label: "Keywords / Clip" },
    { n: "Native", label: "Blackbox FTP" },
    { n: "10 GB", label: "Max Clip Size" },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-5 backdrop-blur-md sm:gap-12">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white sm:text-2xl">
            {item.n}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
