"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const NAV_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Contact", href: "/#contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 80);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        initial={false}
        animate={{
          paddingTop: scrolled ? 12 : 0,
          paddingLeft: scrolled ? 16 : 0,
          paddingRight: scrolled ? 16 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.nav
          className="flex items-center justify-between w-full"
          initial={false}
          animate={{
            maxWidth: scrolled ? 720 : 1280,
            height: scrolled ? 56 : 72,
            borderRadius: scrolled ? 9999 : 0,
            backgroundColor: scrolled
              ? "rgba(253, 249, 242, 0.95)"
              : "rgba(253, 249, 242, 0.6)",
            boxShadow: scrolled
              ? "var(--shadow-pill)"
              : "0 0 0 rgba(0,0,0,0)",
            paddingLeft: scrolled ? 24 : 48,
            paddingRight: scrolled ? 24 : 48,
            backdropFilter: scrolled ? "blur(12px)" : "blur(6px)",
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <a
            href="/"
            className="flex items-center shrink-0"
          >
            <Image
              src="/images/logo.png"
              alt="ItsRellEstate"
              width={140}
              height={73}
              className="h-14 w-auto"
              priority
            />
          </a>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/#apply"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
            >
              Get Started
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center w-11 h-11 text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Open navigation menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </motion.nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-50 w-[280px] bg-white flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-between px-6 h-[72px] border-b border-border">
                <span className="text-lg font-bold text-text-primary">
                  Menu
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-11 h-11 text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label="Close navigation menu"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-col gap-2 px-6 py-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center min-h-[44px] px-3 text-base font-medium text-text-secondary rounded-lg transition-colors duration-200 hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="mt-auto px-6 py-6 border-t border-border">
                <a
                  href="/#apply"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full min-h-[44px] rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Get Started
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
