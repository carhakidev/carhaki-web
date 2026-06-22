const risks = [
  {
    icon: '🔄',
    title: 'Mileage Rollback Fraud',
    description: 'Odometers are wound back before export from the USA. A car showing 60,000 miles may have actually done 200,000. CarHaki shows the real mileage timeline from official US state DMV records.',
  },
  {
    icon: '🚗',
    title: 'Salvage & Rebuilt Titles',
    description: 'Insurance write-offs are repaired, repainted, and shipped to Nigeria. A salvage or rebuilt title means the car was once declared a total loss — a fact sellers rarely disclose.',
  },
  {
    icon: '💧',
    title: 'Flood & Fire Damage',
    description: 'Flood-damaged cars are dried out and exported. Electrical failures and rust appear months later. Our reports reveal flood damage brands recorded by US insurance companies.',
  },
  {
    icon: '⚠️',
    title: 'Open Safety Recalls',
    description: 'Millions of Tokunbo cars have open NHTSA safety recalls that were never repaired before export. CarHaki checks every VIN against the national recall database.',
  },
];

export default function RiskSection() {
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-ch-blue mb-3">
            Why It Matters
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ch-text mb-4">
            The Risks Every Nigerian Tokunbo Buyer Faces
          </h2>
          <p className="text-ch-text-secondary max-w-xl mx-auto">
            Dealers know the full history. Buyers know nothing. CarHaki closes that gap.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {risks.map((risk) => (
            <div
              key={risk.title}
              className="bg-white border border-ch-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{risk.icon}</div>
              <h3 className="font-semibold text-ch-text mb-2">{risk.title}</h3>
              <p className="text-sm text-ch-text-secondary leading-relaxed">{risk.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
