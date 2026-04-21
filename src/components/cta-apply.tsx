"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";

const PATHS = [
  {
    title: "I'm a Tenant",
    description:
      "Apply now and let me help you navigate your subsidy program and find the right home.",
    cta: "Apply as Tenant",
    href: "/apply/tenant",
  },
  {
    title: "I'm a Landlord",
    description:
      "List your property and connect with qualified, voucher-holding tenants.",
    cta: "Apply as Landlord",
    href: "/apply/landlord",
  },
] as const;

export function CtaApply() {
  return (
    <section id="apply" className="bg-surface py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <div className="text-center">
          <TextAnimate
            as="h2"
            animation="blurInUp"
            by="word"
            className="text-3xl md:text-4xl font-bold text-text-primary"
          >
            Ready to Find Your Home?
          </TextAnimate>
          <BlurFade delay={0.3} duration={0.4}>
            <p className="mt-4 text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
              Whether you&apos;re a tenant looking for housing or a landlord
              with available units, I&apos;m here to help.
            </p>
          </BlurFade>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PATHS.map((path, index) => (
            <BlurFade key={path.title} delay={0.4 + index * 0.15} duration={0.4} inView>
              <div className="flex flex-col items-center text-center rounded-2xl border border-border bg-card p-8 md:p-10 shadow-card">
                <h3 className="text-2xl font-bold text-text-primary">
                  {path.title}
                </h3>
                <p className="mt-3 text-base text-text-secondary leading-relaxed">
                  {path.description}
                </p>
                <div className="mt-6">
                  <a
                    href={path.href}
                    className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-xl bg-primary text-primary-foreground text-base font-semibold transition-all duration-200 hover:brightness-110 shadow-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {path.cta}
                  </a>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.7} duration={0.4} inView>
          <p className="mt-10 text-center text-xs text-text-muted">
            Your information is secure. I review every application within 24
            hours.
          </p>
        </BlurFade>
      </div>
    </section>
  );
}
