"use client";

import Image from "next/image";
import { BlurFade } from "@/components/ui/blur-fade";

const CREDENTIALS = [
  "NYS Licensed Real Estate Agent -- Lic. #10401388953",
  "Affiliated with Keller Williams Realty NYC",
  "CityFHEPS, Section 8 & HASA Navigation",
] as const;

export function About() {
  return (
    <section id="about" className="bg-warm py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
          <div className="flex-shrink-0 md:max-w-[40%]">
            <BlurFade delay={0.1} duration={0.5} inView>
              <div className="relative mx-auto w-[280px] h-[340px] md:w-[320px] md:h-[400px] lg:w-[360px] lg:h-[440px] rounded-2xl overflow-hidden shadow-card-hover bg-light shadow-[inset_0_-80px_60px_-20px_rgba(46,42,39,0.15)]">
                <Image
                  src="/nyrell-portrait.png"
                  alt="Nyrell Nunez"
                  fill
                  className="object-contain object-bottom"
                  sizes="(max-width: 768px) 280px, (max-width: 1024px) 320px, 360px"
                />
              </div>
            </BlurFade>
          </div>

          <div className="flex-1 mt-10 md:mt-0">
            <BlurFade delay={0.2} duration={0.5} inView>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
                Meet Nyrell
              </h2>
            </BlurFade>

            <BlurFade delay={0.4} duration={0.5} inView>
              <p className="mt-5 text-base md:text-lg text-text-secondary leading-relaxed max-w-lg">
                I&apos;m a licensed real estate agent serving all five boroughs
                of New York City. I specialize in rental transactions with deep
                experience in CityFHEPS, Section 8, HASA, and other subsidy
                programs. My mission is to close the gap between tenants and
                landlords — making the housing process simple, transparent, and
                stress-free.
              </p>
            </BlurFade>

            <div className="mt-8 flex flex-col gap-3">
              {CREDENTIALS.map((credential, index) => (
                <BlurFade
                  key={credential}
                  delay={0.5 + index * 0.15}
                  duration={0.4}
                  inView
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20">
                      <svg
                        className="w-3.5 h-3.5 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base font-medium text-text-primary">
                      {credential}
                    </span>
                  </div>
                </BlurFade>
              ))}
            </div>

            <BlurFade delay={0.9} duration={0.4} inView>
              <div className="mt-8 flex flex-col gap-2 text-xs sm:text-sm text-text-muted">
                <p>Keller Williams Realty NYC | 99 Hudson St, New York, NY 10013</p>
                <p>Office: (212) 645-1800 | Direct: (347) 555-0192</p>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  );
}
