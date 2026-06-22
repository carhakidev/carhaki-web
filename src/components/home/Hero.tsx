import VinInput from '@/components/shared/VinInput';
import { Badge } from '@/components/ui/badge';

const trustPills = [
  { icon: '🛡️', text: 'NHTSA Recall Data' },
  { icon: '✓', text: '50M+ USA Records' },
  { icon: '⚡', text: 'Instant Results' },
  { icon: '₦', text: '₦15,000 per report' },
];

export default function Hero() {
  return (
    <section className="bg-white py-16 sm:py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <Badge className="mb-6 bg-ch-blue-light text-ch-blue border-0 text-xs font-semibold tracking-wider uppercase">
          Powered by USA Government Records
        </Badge>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ch-text leading-tight mb-6">
          Avoid Salvaged, Flooded &{' '}
          <span className="text-ch-blue">Tampered</span> Tokunbo Cars.
        </h1>

        <p className="text-lg text-ch-text-secondary max-w-xl mx-auto mb-10">
          Enter any USA VIN and get the full vehicle history in seconds —
          accident records, title brands, mileage, and open safety recalls.
        </p>

        <VinInput size="large" className="max-w-2xl mx-auto" />

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {trustPills.map((pill) => (
            <div
              key={pill.text}
              className="flex items-center gap-1.5 bg-slate-50 border border-ch-border rounded-full px-3 py-1.5"
            >
              <span className="text-sm">{pill.icon}</span>
              <span className="text-xs font-medium text-ch-text-secondary">{pill.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
