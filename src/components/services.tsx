"use client";

import { BlurFade } from "@/components/ui/blur-fade";

const SERVICES = [
  {
    title: "CityFHEPS Navigation",
    description:
      "Expert guidance through the CityFHEPS application process. From voucher to lease signing, I handle every step.",
    large: true,
    icon: (
      <svg
        className="w-7 h-7"
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
    title: "Section 8 Assistance",
    description:
      "Navigating Section 8 approvals, inspections, and landlord negotiations.",
    large: false,
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    title: "HASA Support",
    description:
      "Specialized support for HASA recipients finding suitable housing.",
    large: false,
    icon: (
      <svg
        className="w-7 h-7"
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
    title: "Application Support",
    description:
      "From document preparation to apartment inspections, I manage every step of the approval process.",
    large: false,
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 13h4" />
        <path d="M10 17h4" />
      </svg>
    ),
  },
  {
    title: "Landlord Matching",
    description:
      "Connecting property owners with qualified, voucher-holding tenants.",
    large: false,
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 6.1H3" />
        <path d="M21 12.1H3" />
        <path d="M15.1 18H3" />
      </svg>
    ),
  },
] as const;

export function Services() {
  return (
    <section id="services" className="bg-light py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <BlurFade delay={0.1} duration={0.5} inView>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              What I Do
            </h2>
            <p className="mt-3 text-base md:text-lg text-text-secondary max-w-xl mx-auto">
              Comprehensive real estate services with deep subsidy program
              expertise.
            </p>
          </div>
        </BlurFade>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
          {SERVICES.map((service, index) => (
            <BlurFade
              key={service.title}
              delay={0.2 + index * 0.1}
              duration={0.4}
              inView
            >
              <div
                className={`flex flex-col p-6 md:p-8 rounded-2xl bg-card shadow-card transition-shadow duration-300 hover:shadow-card-hover ${
                  service.large ? "md:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                  {service.icon}
                </div>
                <h3 className="mt-5 text-xl font-bold text-text-primary">
                  {service.title}
                </h3>
                <p className="mt-2 text-base text-text-secondary leading-relaxed">
                  {service.description}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
