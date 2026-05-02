import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | ItsRellEstate",
  description:
    "Terms of service for ItsRellEstate, the website of Nyrell Nunez, licensed NYC real estate agent.",
};

const EFFECTIVE_DATE = "May 2, 2026";

interface SectionProps {
  heading: string;
  children: React.ReactNode;
}

function Section({ heading, children }: SectionProps) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-xl font-bold text-text-primary">{heading}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-text-secondary">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100svh-200px)] pt-[120px] pb-28 md:pb-20">
        <div className="mx-auto max-w-[720px] px-6 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Effective date: {EFFECTIVE_DATE}
          </p>

          <div className="mt-8 rounded-2xl bg-card border border-border shadow-card p-6 md:p-8">
            <Section heading="1. Agreement to Terms">
              <p>
                By accessing or using the ItsRellEstate website
                (&ldquo;Site&rdquo;), operated by Nyrell Nunez
                (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
                you agree to be bound by these Terms of Service
                (&ldquo;Terms&rdquo;). If you do not agree with any part of
                these Terms, you must not use the Site.
              </p>
            </Section>

            <Section heading="2. Description of Services">
              <p>
                ItsRellEstate is a personal brand website for Nyrell Nunez, a
                licensed New York State real estate agent (NYS License
                #10401396493) affiliated with Skyline Residential &amp;
                Commercial. The Site provides:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Information about real estate services, including assistance
                  with CityFHEPS, Section 8, and HASA subsidy programs
                </li>
                <li>
                  A tenant application form for prospective tenants seeking
                  housing
                </li>
                <li>
                  A landlord application form for property owners looking to
                  list units for subsidy-eligible tenants
                </li>
                <li>Contact information for direct communication</li>
              </ul>
              <p>
                The Site is informational and facilitates initial intake. It
                does not guarantee housing placement, subsidy approval, or any
                specific outcome.
              </p>
            </Section>

            <Section heading="3. Eligibility">
              <p>
                You must be at least 18 years of age to submit an application
                through the Site. By using the application forms, you represent
                that you are 18 or older and that the information you provide is
                accurate and complete to the best of your knowledge.
              </p>
            </Section>

            <Section heading="4. Application Forms and Data">
              <p>
                The tenant and landlord application forms collect personal
                information necessary to begin the housing search or property
                listing process. By submitting an application, you acknowledge
                that:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  All information you provide must be truthful and accurate
                </li>
                <li>
                  Submitting an application does not create a binding contract,
                  lease agreement, or guarantee of services
                </li>
                <li>
                  A $20 non-refundable processing fee may apply to tenant
                  applications, as disclosed in the form
                </li>
                <li>
                  We reserve the right to decline an application for any
                  lawful reason
                </li>
              </ul>
            </Section>

            <Section heading="5. Draft Saving">
              <p>
                The application forms use your browser&rsquo;s local storage to
                save draft progress. This means your partially completed form
                data is stored on your device, not on our servers. Drafts expire
                automatically after 7 days. Clearing your browser data will
                remove saved drafts. See our{" "}
                <a
                  href="/privacy"
                  className="font-medium text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Privacy Policy
                </a>{" "}
                for more detail on data handling.
              </p>
            </Section>

            <Section heading="6. Processing Fee">
              <p>
                Tenant applications may require a $20 non-refundable processing
                fee. Payment methods (Zelle, CashApp, Venmo) and instructions
                are provided within the application form. The fee covers
                administrative processing of your application and is not a
                deposit, rent payment, or guarantee of housing placement.
              </p>
            </Section>

            <Section heading="7. Communications and Marketing Consent">
              <p>
                By submitting an application, you agree we may use the email
                address and phone number you provide to send you operational
                messages about your application — for example, status updates,
                document requests, viewing scheduling, and payment
                confirmations. These messages are part of providing the
                service you applied for.
              </p>
              <p>
                Promotional emails or SMS about new listings or future
                opportunities are sent ONLY if you explicitly opt in by
                checking the marketing consent box on the application form.
                You can withdraw consent at any time by replying STOP to any
                text message, clicking unsubscribe in any email, or
                contacting us. Standard message and data rates may apply for
                SMS. Frequency varies based on your application activity and
                any marketing program you opt into. Reply HELP for assistance.
              </p>
              <p>
                Withdrawing marketing consent does not stop operational
                communications about an active application.
              </p>
            </Section>

            <Section heading="8. No Guarantees">
              <p>
                We do not guarantee:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Approval or placement in any housing unit</li>
                <li>Approval of any subsidy program application</li>
                <li>Availability of any listed property</li>
                <li>Any specific timeline for housing search or placement</li>
              </ul>
              <p>
                Real estate transactions are subject to landlord approval,
                program eligibility, credit and background checks, and other
                factors outside our control.
              </p>
            </Section>

            <Section heading="9. Intellectual Property">
              <p>
                All content on the Site, including text, images, logos, and
                design, is the property of Nyrell Nunez or used with
                permission. You may not copy, reproduce, distribute, or create
                derivative works from any content on the Site without prior
                written consent.
              </p>
            </Section>

            <Section heading="10. Limitation of Liability">
              <p>
                To the fullest extent permitted by law, Nyrell Nunez and
                Skyline Residential &amp; Commercial shall not be liable for
                any indirect, incidental, consequential, or punitive damages
                arising from your use of the Site or reliance on any
                information provided. The Site is provided &ldquo;as is&rdquo;
                and &ldquo;as available&rdquo; without warranties of any kind.
              </p>
            </Section>

            <Section heading="11. Third-Party Links">
              <p>
                The Site may contain links to third-party websites or services
                (such as social media profiles). We are not responsible for the
                content, privacy practices, or availability of any third-party
                sites.
              </p>
            </Section>

            <Section heading="12. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the
                laws of the State of New York, without regard to conflict of law
                principles. Any disputes arising under these Terms shall be
                resolved in the courts of New York County, New York.
              </p>
            </Section>

            <Section heading="13. Changes to Terms">
              <p>
                We may update these Terms at any time by posting the revised
                version on this page with an updated effective date. Your
                continued use of the Site after changes are posted constitutes
                acceptance of the revised Terms.
              </p>
            </Section>

            <Section heading="14. Contact">
              <p>
                If you have questions about these Terms, contact us at:
              </p>
              <address className="not-italic">
                <p>Nyrell Nunez</p>
                <p>Skyline Residential &amp; Commercial</p>
                <p>105-13 Metropolitan Ave, Forest Hills, NY 11375</p>
                <p>
                  <a
                    href="mailto:nyrell@itsrellestate.com"
                    className="font-medium text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    nyrell@itsrellestate.com
                  </a>
                </p>
                <p>
                  <a
                    href="tel:+13473255709"
                    className="font-medium text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    (347) 325-5709
                  </a>
                </p>
              </address>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
