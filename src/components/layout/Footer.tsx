import Link from 'next/link';
import { Shield } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Check a Car', href: '/search' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'About CarHaki', href: '/about' },
    { label: 'WhatsApp Us', href: 'https://wa.me/2349067816736' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-ch-navy text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-ch-blue rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">
                <span className="text-white">Car</span>
                <span className="text-ch-blue">Haki</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">
              Nigeria&apos;s vehicle intelligence platform. Know the truth about every Tokunbo car before you buy.
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-ch-green rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">All systems operational</span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            © 2026 CarHaki Nigeria. All rights reserved. Powered by USA government records.
          </p>
          <div className="flex items-center gap-4">
            {['Instagram', 'X', 'Facebook', 'YouTube', 'WhatsApp'].map((social) => (
              <a
                key={social}
                href={social === 'WhatsApp' ? 'https://wa.me/2349067816736' : '#'}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
