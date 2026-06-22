import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-ch-bg flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-ch-text mb-4">
        Car<span className="text-ch-blue">Haki</span>
      </h1>
      <p className="text-ch-text-secondary mb-8 max-w-md">
        Nigeria&apos;s vehicle intelligence platform. Full site coming soon.
      </p>
      <div className="flex gap-3">
        <Link href="/search">
          <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white">
            Check a Car
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="border-ch-blue text-ch-blue">
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
