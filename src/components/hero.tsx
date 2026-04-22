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
      className="relative overflow-hidden bg-light pt-[72px] md:flex md:min-h-[calc(100svh-72px)] md:items-end"
    >
      {/* Mobile image -- visible block at top */}
      <div className="relative h-[42svh] md:hidden">
        <Image
          src="/images/nyc-building.jpg"
          alt="NYC brownstone apartment building"
          fill
          className="rounded-b-3xl object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 rounded-b-3xl bg-dark/25" />
      </div>

      {/* Desktop image -- full bleed background */}
      <Image
        src="/images/nyc-building.jpg"
        alt="NYC brownstone apartment building"
        fill
        className="hidden object-cover md:block"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 hidden bg-gradient-to-t from-dark/45 via-dark/20 to-dark/10 md:block" />

      {/* Content */}
      <div className="relative z-10 w-full px-6 py-8 md:mx-auto md:max-w-[1280px] md:px-8 md:py-20 lg:px-12">
        <div className="md:max-w-2xl md:rounded-3xl md:bg-light/94 md:p-10 md:backdrop-blur-md md:shadow-card-hover">
          <BlurFade delay={0.05} duration={0.4}>
            <p className="text-xs sm:text-sm font-medium text-text-secondary tracking-wide uppercase">
              CityFHEPS / Section 8 / HASA Specialist
            </p>
          </BlurFade>

          <div className="mt-3 md:mt-4">
            <TextAnimate
              as="h1"
              animation="blurInUp"
              by="word"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.1] text-text-primary"
            >
              Your Voucher. Your Home. I Handle the Rest.
            </TextAnimate>
          </div>

          <BlurFade delay={0.2} duration={0.4}>
            <p className="mt-3 md:mt-5 text-base md:text-xl text-text-secondary max-w-lg leading-relaxed">
              I handle CityFHEPS, Section 8 &amp; HASA so you don&apos;t have
              to. From application to move-in day, I manage every step.
            </p>
          </BlurFade>

          <BlurFade delay={0.3} duration={0.4}>
            <div className="mt-5 md:mt-8 grid grid-cols-3 gap-3 sm:flex sm:gap-8 md:gap-12">
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
          </BlurFade>

          <BlurFade delay={0.4} duration={0.4}>
            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <a
                href="/#apply"
                className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-xl bg-primary text-primary-foreground text-base font-semibold transition-all duration-200 hover:brightness-110 shadow-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start Your Application
              </a>
              <a
                href="/apply/landlord"
                className="inline-flex items-center min-h-[48px] px-4 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
