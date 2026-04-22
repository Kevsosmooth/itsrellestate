import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { TenantForm } from "./tenant-form";

export default function TenantApplyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100svh-200px)] pt-[120px] pb-28 md:pb-20">
        <div className="mx-auto max-w-[640px] px-6 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
            Tenant Application
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            Fill out the form below to get started with your housing search.
          </p>
          <div className="mt-8 rounded-2xl bg-card border border-border shadow-card p-6 md:p-8">
            <TenantForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
