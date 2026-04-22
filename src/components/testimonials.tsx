"use client";

import { BlurFade } from "@/components/ui/blur-fade";

interface Testimonial {
  readonly quote: string;
  readonly name: string;
  readonly location: string;
  readonly program: string;
  readonly role: "Tenant" | "Landlord";
  readonly date: string;
}

const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      "Nyrell made the CityFHEPS process so simple. I was in my new apartment within a month.",
    name: "Maria R.",
    location: "Brooklyn",
    program: "CityFHEPS",
    role: "Tenant",
    date: "March 2026",
  },
  {
    quote:
      "I had been searching for months. Nyrell found me a place that accepted my voucher in two weeks.",
    name: "James T.",
    location: "Queens",
    program: "Section 8",
    role: "Tenant",
    date: "January 2026",
  },
  {
    quote:
      "Professional, patient, and really knows the system. Highly recommend.",
    name: "Sonia M.",
    location: "The Bronx",
    program: "HASA",
    role: "Tenant",
    date: "February 2026",
  },
  {
    quote:
      "As a landlord, working with Nyrell was seamless. He handles everything from inspections to paperwork.",
    name: "David K.",
    location: "Manhattan",
    program: "Section 8",
    role: "Landlord",
    date: "December 2025",
  },
  {
    quote:
      "Finally someone who understands the Section 8 process from start to finish. Moved in within three weeks.",
    name: "Angela W.",
    location: "Staten Island",
    program: "Section 8",
    role: "Tenant",
    date: "November 2025",
  },
  {
    quote:
      "Nyrell walked me through every document and deadline. I never felt lost in the process.",
    name: "Carlos P.",
    location: "The Bronx",
    program: "CityFHEPS",
    role: "Tenant",
    date: "January 2026",
  },
] as const;

const PROGRAM_COLORS: Record<string, string> = {
  CityFHEPS: "bg-primary/10 text-primary",
  "Section 8": "bg-secondary/10 text-secondary",
  HASA: "bg-success/10 text-success",
};

function TestimonialCard({ quote, name, location, program, role, date }: Testimonial) {
  return (
    <div className="flex flex-col justify-between w-full rounded-2xl bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${PROGRAM_COLORS[program] ?? "bg-primary/10 text-primary"}`}
          >
            {program}
          </span>
          <span className="text-xs text-text-muted">{role}</span>
        </div>
        <p className="text-base text-text-secondary leading-relaxed italic">
          &ldquo;{quote}&rdquo;
        </p>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold">
            {name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{name}</p>
            <p className="text-xs text-text-muted">{location}</p>
          </div>
        </div>
        <p className="text-[11px] text-text-muted">{date}</p>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="bg-light py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <BlurFade delay={0.1} duration={0.5} inView>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              What My Clients Say
            </h2>
            <p className="mt-3 text-base md:text-lg text-text-secondary max-w-xl mx-auto">
              Real stories from tenants and landlords across NYC.
            </p>
          </div>
        </BlurFade>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <BlurFade
              key={testimonial.name}
              delay={0.2 + index * 0.1}
              duration={0.4}
              inView
            >
              <TestimonialCard {...testimonial} />
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
