"use client";

import Image from "next/image";
import { BlurFade } from "@/components/ui/blur-fade";

const CREDENTIALS = [
  "NYS Licensed Real Estate Agent -- Lic. #10401396493",
  "Associated with Skyline Residential & Commercial",
  "CityFHEPS, Section 8 & HASA Navigation",
] as const;

export function About() {
  return (
    <section id="about" className="bg-warm py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
          <div className="flex-shrink-0 md:max-w-[40%]">
            <BlurFade delay={0.1} duration={0.5} inView>
              <div className="relative mx-auto w-[280px] h-[340px] md:w-[320px] md:h-[400px] lg:w-[360px] lg:h-[440px] rounded-2xl overflow-hidden shadow-card-hover bg-gradient-to-b from-primary/10 to-secondary/10">
                <Image
                  src="/nyrell-portrait.png"
                  alt="Nyrell Nunez"
                  fill
                  className="object-contain object-bottom scale-115"
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
                I&apos;m a licensed real estate agent based in New York, known
                for a hands-on approach and deep understanding of the local
                market. I work directly with developers, first-time buyers,
                seasoned investors, and tenants to meet their goals. I
                specialize in CityFHEPS, Section 8, HASA, and other subsidy
                programs — making the housing process simple, transparent,
                and stress-free.
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
                <p>Skyline Residential & Commercial | 105-13 Metropolitan Ave, Forest Hills, NY 11375</p>
                <p>(347) 325-5709 | nyrell@itsrellestate.com</p>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  );
}
