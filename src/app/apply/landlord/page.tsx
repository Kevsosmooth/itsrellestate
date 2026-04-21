import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function LandlordApplyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100svh-200px)] pt-[120px] pb-20">
        <div className="mx-auto max-w-[640px] px-6 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
            Landlord Application
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            List your property and connect with qualified tenants.
          </p>
          <div className="mt-10 rounded-2xl bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">
              Application form coming soon.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
