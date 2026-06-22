'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface VinInputProps {
  placeholder?: string;
  buttonText?: string;
  className?: string;
  size?: 'default' | 'large';
}

export default function VinInput({
  placeholder = 'Enter VIN — e.g. 1HGCM82633A004352',
  buttonText = 'Check History',
  className,
  size = 'default',
}: VinInputProps) {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = vin.trim().toUpperCase();

    if (!cleaned) {
      setError('Please enter a VIN.');
      return;
    }
    if (cleaned.length !== 17) {
      setError('VIN must be exactly 17 characters.');
      return;
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
      setError('Invalid VIN format. VINs only contain letters A-H, J-N, P-Z and numbers.');
      return;
    }

    setError('');
    setLoading(true);
    router.push(`/preview/${cleaned}`);
  };

  const sampleVins = ['1HGCM82633A004352', '5TDYK3DC8DS290235'];

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          'flex gap-2',
          size === 'large' ? 'flex-col sm:flex-row' : 'flex-row'
        )}>
          <Input
            value={vin}
            onChange={(e) => {
              setVin(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder={placeholder}
            maxLength={17}
            className={cn(
              'font-mono flex-1 border-ch-border focus-visible:ring-ch-blue',
              size === 'large' ? 'h-12 text-base' : 'h-10',
              error && 'border-ch-red focus-visible:ring-ch-red'
            )}
          />
          <Button
            type="submit"
            disabled={loading}
            className={cn(
              'bg-ch-blue hover:bg-ch-blue-dark text-white shrink-0',
              size === 'large' ? 'h-12 px-6' : 'h-10 px-4'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {buttonText}
          </Button>
        </div>
      </form>

      {error && (
        <p className="text-ch-red text-sm mt-2">{error}</p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-ch-text-muted">Sample VINs:</span>
        {sampleVins.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVin(v)}
            className="text-xs font-mono bg-slate-100 hover:bg-ch-blue-light text-ch-text-secondary hover:text-ch-blue px-2 py-1 rounded transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
