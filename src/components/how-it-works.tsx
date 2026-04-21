"use client";

import { BlurFade } from "@/components/ui/blur-fade";

const STEPS = [
  {
    step: 1,
    title: "Apply",
    description:
      "Fill out a quick application. Tell us about your housing needs and subsidy program.",
    icon: (
      <svg
        className="w-6 h-6"
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
        <path d="M10 9h1" />
      </svg>
    ),
  },
  {
    step: 2,
    title: "I Match You",
    description:
      "I find landlords who accept your program and match you with the right apartment.",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
        <path d="m6 12 4 4" />
        <path d="M4 16c0 4 8 4 8 0" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Move In",
    description:
      "I handle the paperwork, inspections, and approvals. You get your keys.",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-light py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <BlurFade delay={0.1} duration={0.5} inView>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              How It Works
            </h2>
            <p className="mt-3 text-base md:text-lg text-text-secondary max-w-xl mx-auto">
              Three simple steps from application to move-in day.
            </p>
          </div>
        </BlurFade>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-0 relative">
          <div
            className="hidden md:block absolute top-[36px] h-[3px] z-0 overflow-hidden rounded-full"
            style={{
              left: "calc(33.33% - 16px)",
              width: "calc(33.33% - 32px)",
              marginLeft: "32px",
            }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/15" />
            <div className="absolute inset-0 overflow-hidden rounded-full motion-reduce:hidden">
              <div
                className="absolute top-1/2 left-0 h-[3px] w-[34%] -translate-y-1/2 rounded-full animate-pipeline-connector-wave"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, var(--color-primary) 25%, var(--color-primary) 75%, transparent 100%)",
                  boxShadow:
                    "0 0 10px oklch(0.546 0.22 255 / 0.55), 0 0 18px oklch(0.546 0.22 255 / 0.35)",
                  animationDelay: "0s",
                }}
              />
            </div>
          </div>

          <div
            className="hidden md:block absolute top-[36px] h-[3px] z-0 overflow-hidden rounded-full"
            style={{
              left: "calc(66.66% - 16px)",
              width: "calc(33.33% - 32px)",
              marginLeft: "32px",
            }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/15" />
            <div className="absolute inset-0 overflow-hidden rounded-full motion-reduce:hidden">
              <div
                className="absolute top-1/2 left-0 h-[3px] w-[34%] -translate-y-1/2 rounded-full animate-pipeline-connector-wave"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, var(--color-primary) 25%, var(--color-primary) 75%, transparent 100%)",
                  boxShadow:
                    "0 0 10px oklch(0.546 0.22 255 / 0.55), 0 0 18px oklch(0.546 0.22 255 / 0.35)",
                  animationDelay: "1.2s",
                }}
              />
            </div>
          </div>

          {STEPS.map((step, index) => (
            <div key={step.step}>
              {index > 0 && (
                <div className="flex md:hidden justify-center">
                  <div className="relative w-[3px] h-12 overflow-hidden">
                    <div className="absolute inset-0 bg-primary/15" />
                    <div className="absolute inset-0 overflow-hidden motion-reduce:hidden">
                      <div
                        className="absolute left-0 top-0 w-[3px] h-[40%] animate-pipeline-connector-wave-vertical"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 0%, var(--color-primary) 25%, var(--color-primary) 75%, transparent 100%)",
                          boxShadow:
                            "0 0 10px oklch(0.546 0.22 255 / 0.55), 0 0 18px oklch(0.546 0.22 255 / 0.35)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <BlurFade
                delay={0.2 + index * 0.15}
                duration={0.4}
                inView
              >
                <div className="relative flex flex-col items-center text-center bg-card rounded-2xl p-8 mx-3 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold">
                    {step.step}
                  </div>

                  <div className="mt-5 flex items-center justify-center w-10 h-10 text-primary">
                    {step.icon}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </BlurFade>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
