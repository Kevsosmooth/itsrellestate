import { cn } from "@/lib/utils";

interface FormSectionProps {
  heading?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ heading, description, children, className }: FormSectionProps) {
  return (
    <fieldset
      className={cn(
        "border-none p-0 m-0 min-w-0 [&+&]:border-t [&+&]:border-border [&+&]:pt-6 [&+&]:mt-6",
        className,
      )}
    >
      {heading && (
        <legend className="text-lg font-semibold text-text-primary mb-1 float-none w-full">
          {heading}
        </legend>
      )}
      {description && (
        <p className="text-sm text-text-secondary mb-4">{description}</p>
      )}
      <div className="flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}
