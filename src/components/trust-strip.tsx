"use client";

import { Marquee } from "@/components/ui/marquee";

const TRUST_ITEMS = [
  {
    label: "CityFHEPS",
    description: "Approved Navigator",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Section 8",
    description: "HCV Specialist",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "HASA",
    description: "Certified Support",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "24hr Response",
    description: "Application Review",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "All 5 Boroughs",
    description: "Full NYC Coverage",
    icon: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
] as const;

export function TrustStrip() {
  return (
    <section className="bg-surface py-3 md:py-5 border-y border-border">
      <Marquee className="[--duration:25s] [--gap:2rem] md:[--gap:3rem]" pauseOnHover>
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 px-2"
          >
            <div className="flex items-center justify-center w-7 h-7 md:w-9 md:h-9 rounded-lg bg-primary/10 text-primary">
              {item.icon}
            </div>
            <div>
              <p className="text-xs md:text-sm font-semibold text-text-primary leading-tight whitespace-nowrap">
                {item.label}
              </p>
              <p className="hidden md:block text-[11px] text-text-muted leading-tight">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </Marquee>
    </section>
  );
}
