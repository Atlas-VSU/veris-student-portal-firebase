import Image from "next/image";

interface PaymentBrandHeaderProps {
  /** Short label shown below the brand name, e.g. "Student Verification" */
  stepLabel?: string;
}

export function PaymentBrandHeader({ stepLabel }: PaymentBrandHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 select-none">
      <div className="flex items-center gap-3">
        {/* Logo: Circular moss green container with white icon */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary p-2 border border-border/10 shadow-sm text-primary-foreground">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold font-serif leading-none tracking-wide text-foreground">
            VERIS
          </span>
          <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
            Payment Portal
          </span>
        </div>
      </div>

      {stepLabel && (
        <p className="text-sm text-muted-foreground font-medium">{stepLabel}</p>
      )}
    </div>
  );
}
