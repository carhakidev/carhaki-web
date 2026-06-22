const stats = [
  { value: '10+', label: 'Reports Generated' },
  { value: 'NMVTIS', label: 'Official USA Database' },
  { value: '30s', label: 'Avg Report Time' },
  { value: 'NG', label: 'Built for Nigeria' },
];

export default function StatsStrip() {
  return (
    <section className="bg-slate-50 border-y border-ch-border py-8 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl font-bold text-ch-blue">{stat.value}</div>
            <div className="text-xs text-ch-text-muted mt-1 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
