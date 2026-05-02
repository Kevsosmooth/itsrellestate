import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | ItsRellEstate",
  description:
    "Privacy policy for ItsRellEstate, the website of Nyrell Nunez, licensed NYC real estate agent.",
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

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100svh-200px)] pt-[120px] pb-28 md:pb-20">
        <div className="mx-auto max-w-[720px] px-6 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Effective date: {EFFECTIVE_DATE}
          </p>

          <div className="mt-8 rounded-2xl bg-card border border-border shadow-card p-6 md:p-8">
            <Section heading="1. Introduction">
              <p>
                This Privacy Policy explains how ItsRellEstate, operated by
                Nyrell Nunez (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                &ldquo;our&rdquo;), handles information when you use our
                website (&ldquo;Site&rdquo;). We are committed to protecting
                your personal information and being transparent about what we
                collect and how it is used.
              </p>
            </Section>

            <Section heading="2. Information We Collect">
              <p>
                <strong className="text-text-primary">
                  Tenant Application Form
                </strong>
              </p>
              <p>
                When you complete a tenant application, we may collect the
                following categories of information:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong className="text-text-primary">
                    Identity and contact:
                  </strong>{" "}
                  full name, date of birth, phone number, email address,
                  current address, emergency contact name and phone
                </li>
                <li>
                  <strong className="text-text-primary">Housing details:</strong>{" "}
                  preferred borough, rental assistance program enrollment,
                  voucher number, voucher bedroom size, voucher expiration date,
                  current landlord contact information, credit score range
                </li>
                <li>
                  <strong className="text-text-primary">
                    Household composition:
                  </strong>{" "}
                  names, relationships, and ages of additional occupants
                </li>
                <li>
                  <strong className="text-text-primary">Employment:</strong>{" "}
                  employer name and address, supervisor name and phone, pay type,
                  pay amount, hours worked, pay frequency, veteran status,
                  tax filing status
                </li>
                <li>
                  <strong className="text-text-primary">Income sources:</strong>{" "}
                  types of income (cash assistance, SSI, food stamps, other)
                </li>
                <li>
                  <strong className="text-text-primary">
                    Housing specialist:
                  </strong>{" "}
                  case worker or housing specialist name, phone, and email
                </li>
                <li>
                  <strong className="text-text-primary">
                    Lifestyle disclosures:
                  </strong>{" "}
                  smoking status, pet ownership
                </li>
                <li>
                  <strong className="text-text-primary">
                    Electronic signature:
                  </strong>{" "}
                  first and last name as authorization
                </li>
              </ul>

              <p className="mt-4">
                <strong className="text-text-primary">
                  Landlord Application Form
                </strong>
              </p>
              <p>
                When you complete a landlord application, we may collect the
                following categories of information:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong className="text-text-primary">
                    Property details:
                  </strong>{" "}
                  property address, ownership type, year built, number of
                  stories, residential and commercial units, rent stabilization
                  status, utility responsibilities
                </li>
                <li>
                  <strong className="text-text-primary">
                    Identity and tax:
                  </strong>{" "}
                  legal name or business name, Social Security Number (SSN) or
                  Employer Identification Number (EIN)
                </li>
                <li>
                  <strong className="text-text-primary">
                    Banking and payment:
                  </strong>{" "}
                  bank name, account type, account number, routing number,
                  payment preferences, Zelle contact information, ACH details
                </li>
                <li>
                  <strong className="text-text-primary">Contact:</strong>{" "}
                  owner/manager name, phone, and email; authorized
                  representative details; point of contact details
                </li>
                <li>
                  <strong className="text-text-primary">Mailing address:</strong>{" "}
                  separate mailing address if different from property
                </li>
                <li>
                  <strong className="text-text-primary">Unit details:</strong>{" "}
                  unit numbers, floor, bedroom count, and monthly rent for each
                  listed unit
                </li>
                <li>
                  <strong className="text-text-primary">
                    Electronic signature:
                  </strong>{" "}
                  first and last name as authorization
                </li>
              </ul>
            </Section>

            <Section heading="3. How Your Data Is Stored">
              <p>
                <strong className="text-text-primary">
                  Browser local storage (draft saving):
                </strong>{" "}
                While you are completing an application form, your progress is
                saved to your browser&rsquo;s local storage so you can return
                and finish later. This data is stored only on your device and
                is not transmitted to our servers during the draft stage. Drafts
                expire and are automatically deleted after 7 days. You can
                clear your draft at any time using the &ldquo;Start
                Fresh&rdquo; button in the form or by clearing your browser
                data.
              </p>
              <p>
                <strong className="text-text-primary">
                  Upon submission:
                </strong>{" "}
                When you submit a completed application, the form data is
                prepared for review by Nyrell Nunez. Your submitted information
                may be used to coordinate with landlords, subsidy program
                administrators, and other parties involved in the housing
                process.
              </p>
            </Section>

            <Section heading="4. How We Use Your Information">
              <p>We use the information you provide to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Process your tenant or landlord application
                </li>
                <li>
                  Match tenants with available housing and landlords with
                  qualified tenants
                </li>
                <li>
                  Communicate with you about your application status, property
                  viewings, or listing updates
                </li>
                <li>
                  Coordinate with subsidy program administrators (CityFHEPS,
                  Section 8, HASA, and others) on your behalf
                </li>
                <li>
                  Verify information with employers, current landlords, or
                  housing specialists as needed
                </li>
                <li>Process application fees</li>
                <li>
                  Comply with legal obligations and real estate licensing
                  requirements
                </li>
              </ul>
            </Section>

            <Section heading="5. Communications and Marketing Consent">
              <p>
                <strong className="text-text-primary">
                  Operational communications:
                </strong>{" "}
                We will use the email address and phone number you provide on
                your application to send you messages about your application
                (status updates, document requests, viewing scheduling, payment
                confirmations, and similar transactional matters). These
                communications are part of providing the service you applied
                for and are not optional while your application is active.
              </p>
              <p>
                <strong className="text-text-primary">
                  Marketing communications:
                </strong>{" "}
                We will only send you promotional emails or text messages
                about new listings, upcoming opportunities, or general
                real-estate updates if you have given explicit consent by
                checking the marketing opt-in box on the application form. You
                can withdraw consent at any time by replying STOP to any text
                message, clicking unsubscribe in any email, or contacting us
                using the details in Section 14. Withdrawing marketing consent
                does not affect operational communications.
              </p>
              <p>
                <strong className="text-text-primary">SMS rates:</strong>{" "}
                Standard message and data rates may apply for text messages
                sent or received. Frequency varies based on your application
                activity and any marketing program you opt into. Reply STOP to
                cancel marketing texts; reply HELP for assistance.
              </p>
            </Section>

            <Section heading="6. Information Sharing">
              <p>
                We do not sell your personal information. We may share your
                information with:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong className="text-text-primary">
                    Landlords or tenants:
                  </strong>{" "}
                  to facilitate housing matches and lease agreements
                </li>
                <li>
                  <strong className="text-text-primary">
                    Government agencies:
                  </strong>{" "}
                  subsidy program administrators (HRA, NYCHA, HPD) as required
                  for voucher processing and compliance
                </li>
                <li>
                  <strong className="text-text-primary">
                    Skyline Residential &amp; Commercial:
                  </strong>{" "}
                  the brokerage with which Nyrell Nunez is affiliated, for
                  transaction coordination and compliance
                </li>
                <li>
                  <strong className="text-text-primary">
                    Legal or regulatory bodies:
                  </strong>{" "}
                  when required by law, court order, or regulatory obligation
                </li>
              </ul>
              <p>
                We will never share your SSN, EIN, or banking information with
                parties other than those directly involved in completing the
                transaction or as required by law.
              </p>
            </Section>

            <Section heading="7. Cookies and Tracking">
              <p>
                The Site does not use cookies. We do not use Google Analytics,
                Meta Pixel, or any other third-party tracking or advertising
                tools. We do not track your browsing behavior across other
                websites.
              </p>
            </Section>

            <Section heading="8. Third-Party Services">
              <p>
                <strong className="text-text-primary">Fonts:</strong> The Site
                uses Google Fonts (Plus Jakarta Sans), which are self-hosted
                through our framework. Font files are served from our own
                domain, not from Google servers. No data is sent to Google when
                you visit the Site.
              </p>
              <p>
                <strong className="text-text-primary">Hosting:</strong> The
                Site is hosted on Vercel. Vercel may collect standard server
                logs (IP addresses, request timestamps, browser information) as
                part of normal web hosting operations. See{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Vercel&rsquo;s Privacy Policy
                </a>{" "}
                for details.
              </p>
              <p>
                <strong className="text-text-primary">Social media:</strong>{" "}
                The Site links to a Facebook profile. Clicking that link takes
                you to Facebook, which is governed by Meta&rsquo;s privacy
                policy. We do not embed Facebook content or load Meta tracking
                scripts.
              </p>
            </Section>

            <Section heading="9. Data Security">
              <p>
                We take reasonable measures to protect your personal
                information. However, no method of transmission over the
                internet or electronic storage is completely secure. While we
                strive to protect your data, we cannot guarantee absolute
                security.
              </p>
              <p>
                Sensitive data such as Social Security Numbers, bank account
                numbers, and routing numbers that you enter into our forms are
                stored in your browser&rsquo;s local storage during the draft
                stage. We recommend completing and submitting applications in a
                single session when possible, and not using shared or public
                computers for applications that contain sensitive financial
                information.
              </p>
            </Section>

            <Section heading="10. Data Retention">
              <p>
                <strong className="text-text-primary">Draft data:</strong>{" "}
                Stored in your browser for up to 7 days, then automatically
                deleted. You can delete it sooner by clearing your form or
                browser data.
              </p>
              <p>
                <strong className="text-text-primary">Submitted data:</strong>{" "}
                Retained for as long as necessary to process your application,
                complete the transaction, and comply with legal and regulatory
                record-keeping requirements. New York State requires real estate
                transaction records to be maintained for a minimum of 3 years.
              </p>
            </Section>

            <Section heading="11. Your Rights">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong className="text-text-primary">
                    Access your data:
                  </strong>{" "}
                  request a copy of the personal information we hold about you
                </li>
                <li>
                  <strong className="text-text-primary">
                    Correct your data:
                  </strong>{" "}
                  request correction of inaccurate information
                </li>
                <li>
                  <strong className="text-text-primary">
                    Delete your data:
                  </strong>{" "}
                  request deletion of your personal information, subject to
                  legal retention requirements
                </li>
                <li>
                  <strong className="text-text-primary">
                    Withdraw consent:
                  </strong>{" "}
                  withdraw your consent to data processing at any time by
                  contacting us
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us using the
                information in Section 14 below.
              </p>
            </Section>

            <Section heading="12. Children's Privacy">
              <p>
                The Site is not directed to individuals under 18 years of age.
                We do not knowingly collect personal information from children.
                If you believe a minor has submitted information through our
                forms, contact us and we will delete it promptly.
              </p>
            </Section>

            <Section heading="13. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Changes
                will be posted on this page with an updated effective date. We
                encourage you to review this policy periodically.
              </p>
            </Section>

            <Section heading="14. Contact">
              <p>
                If you have questions about this Privacy Policy or wish to
                exercise your data rights, contact us at:
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
