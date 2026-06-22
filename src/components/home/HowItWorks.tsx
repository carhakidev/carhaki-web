import Link from 'next/link';
import { Button } from '@/components/ui/button';

const steps = [
  {
    number: '01',
    title: 'Enter the VIN',
    description: "Find the 17-character VIN on the car's dashboard (visible through the windshield), door sticker, or import documents.",
  },
  {
    number: '02',
    title: 'Pay Securely',
    description: 'Pay ₦15,000 via card or bank transfer through Paystack. Money-back guarantee if no data is found for your VIN.',
  },
  {
    number: '03',
    title: 'Get Your Report',
    description: 'Instant full report: accident history, title brands, odometer timeline, open recalls, and an AI plain-English summary.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-ch-blue mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ch-text">
            Get a Full Report in 3 Steps
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-5xl font-extrabold text-ch-blue opacity-20 mb-3">
                {step.number}
              </div>
              <h3 className="font-semibold text-ch-text mb-2">{step.title}</h3>
              <p className="text-sm text-ch-text-secondary leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/search">
            <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white px-8">
              Check a Car Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
