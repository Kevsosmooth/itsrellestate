"use client";

import { RetroGrid } from "@/components/ui/retro-grid";
import { Dock, DockIcon } from "@/components/ui/dock";
import Image from "next/image";

const SOCIAL_LINKS = [
  {
    label: "Phone",
    href: "tel:+13473255709",
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
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:nyrell@itsrellestate.com",
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
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61578096930313",
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
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
] as const;

export function Footer() {
  return (
    <footer id="contact" className="relative bg-dark overflow-hidden">
      <div className="h-16 bg-gradient-to-b from-surface to-dark" />
      <div className="py-14 md:py-16 relative">
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none overflow-hidden"
        style={{ "--retro-grid-fade": "transparent" } as React.CSSProperties}
      >
        <RetroGrid lightLineColor="white" darkLineColor="white" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/logo.png"
            alt="ItsRellEstate"
            width={200}
            height={105}
            className="h-14 w-auto brightness-0 invert"
          />
          <p className="mt-1 text-sm text-text-on-dark/70">
            Licensed Real Estate Agent | NYS Lic. #10401396493
          </p>
          <p className="mt-1 text-xs text-text-on-dark/50">
            Skyline Residential & Commercial | 105-13 Metropolitan Ave, Forest Hills, NY 11375
          </p>
          <p className="mt-1 text-xs text-text-on-dark/50">
            (347) 325-5709 | nyrell@itsrellestate.com
          </p>

          <Dock
            className="mt-8 border-white/10 bg-white/5"
            iconSize={40}
            iconMagnification={55}
          >
            {SOCIAL_LINKS.map((link) => (
              <DockIcon key={link.label}>
                <a
                  href={link.href}
                  target={link.label === "Facebook" ? "_blank" : undefined}
                  rel={
                    link.label === "Facebook"
                      ? "noopener noreferrer"
                      : undefined
                  }
                  aria-label={link.label}
                  className="flex items-center justify-center w-full h-full rounded-full bg-white/10 text-text-on-dark/80 transition-colors duration-200 hover:bg-primary/20 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {link.icon}
                </a>
              </DockIcon>
            ))}
          </Dock>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-4">
            <a
              href="/terms"
              className="text-xs text-text-on-dark/50 transition-colors duration-200 hover:text-text-on-dark/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Terms of Service
            </a>
            <span className="text-text-on-dark/30" aria-hidden="true">|</span>
            <a
              href="/privacy"
              className="text-xs text-text-on-dark/50 transition-colors duration-200 hover:text-text-on-dark/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Privacy Policy
            </a>
          </div>
          <p className="text-xs text-text-on-dark/50">
            &copy; {new Date().getFullYear()} Nyrell Nunez. All rights reserved.
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}
