import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { TrustStrip } from "@/components/trust-strip";
import { About } from "@/components/about";
import { Services } from "@/components/services";
import { HowItWorks } from "@/components/how-it-works";
import { Testimonials } from "@/components/testimonials";
import { PastProjects } from "@/components/past-projects";
import { CtaApply } from "@/components/cta-apply";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <About />
        <Services />
        <HowItWorks />
        <Testimonials />
        <PastProjects />
        <CtaApply />
      </main>
      <Footer />
    </>
  );
}
