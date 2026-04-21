"use client";

import Image from "next/image";
import { TextAnimate } from "@/components/ui/text-animate";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";

const STATS = [
  { value: 5, label: "Boroughs Served" },
  { value: 100, suffix: "+", label: "Families Placed" },
  { value: 3, label: "Subsidy Programs" },
] as const;

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[calc(100svh-72px)] flex items-center overflow-hidden pt-[72px]"
    >
      <Image
        src="/images/nyc-bridge.jpg"
        alt="Aerial view of New York City"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-dark/20" />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12 py-14 md:py-20">
        <BlurFade delay={0.1} duration={0.5}>
          <div className="max-w-2xl bg-light/94 backdrop-blur-md rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-10 shadow-card-hover">
            <p className="text-xs sm:text-sm font-medium text-text-secondary tracking-wide uppercase">
              CityFHEPS / Section 8 / HASA Specialist
            </p>

            <div className="mt-3 md:mt-4">
              <TextAnimate
                as="h1"
                animation="blurInUp"
                by="word"
                className="text-2xl sm:text-3xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.1] text-text-primary"
              >
                Your Voucher. Your Home. I Handle the Rest.
              </TextAnimate>
            </div>

            <p className="mt-3 md:mt-5 text-sm sm:text-base md:text-xl text-text-secondary max-w-lg leading-relaxed">
              I handle CityFHEPS, Section 8 &amp; HASA so you don&apos;t have
              to.
            </p>

            <div className="mt-5 md:mt-8 flex gap-5 sm:gap-8 md:gap-12">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                    <NumberTicker value={stat.value} />
                    {"suffix" in stat && stat.suffix}
                  </span>
                  <span className="mt-1 text-[10px] sm:text-xs md:text-sm font-medium text-text-muted">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 md:mt-10 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <a
                href="/#apply"
                className="inline-flex items-center justify-center min-h-[44px] md:min-h-[48px] px-6 md:px-8 rounded-xl bg-primary text-primary-foreground text-sm md:text-base font-semibold transition-all duration-200 hover:brightness-110 shadow-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start Your Application
              </a>
              <a
                href="/apply/landlord"
                className="inline-flex items-center min-h-[44px] md:min-h-[48px] px-4 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                I&apos;m a landlord
                <svg
                  className="ml-1 w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
