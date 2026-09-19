import { cn } from "@/lib/utils";
import { OnlinePaymentMethod } from "../types";

const ALL_PAYMENT_METHODS = [
  { value: "gcash" as OnlinePaymentMethod,         label: "GCash", icon: "📱", description: "Mobile wallet" },
  { value: "bank_transfer" as OnlinePaymentMethod, label: "Bank",  icon: "🏦", description: "Bank / InstaPay" },
] as const;

interface PaymentMethodSelectorProps {
  value: string;
  error?: string;
  onSelect: (value: OnlinePaymentMethod) => void;
  /** Pass a filtered subset when only certain methods are available for this org.
   *  Falls back to all methods when omitted. */
  methods?: Array<{ value: OnlinePaymentMethod; label: string; icon: string; description: string }>;
}

export function PaymentMethodSelector({ value, error, onSelect, methods }: PaymentMethodSelectorProps) {
  const displayMethods = methods ?? ALL_PAYMENT_METHODS;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-3">
        {displayMethods.map(method => (
          <button
            key={method.value}
            type="button"
            onClick={() => onSelect(method.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 text-center transition-all cursor-pointer",
              value === method.value
                ? "border-green-500 bg-green-50"
                : "border-border bg-card hover:border-green-300 hover:bg-green-50/50"
            )}
          >
            <span className="text-xl">{method.icon}</span>
            <span className={cn(
              "text-xs font-700",
              value === method.value
                ? "text-green-700 font-bold"
                : "text-foreground font-semibold"
            )}>
              {method.label}
            </span>
            <span className="text-[11px] text-muted-foreground">{method.description}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5 mt-0.5">
          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-white font-mono">!</span>
          {error}
        </p>
      )}
    </div>
  );
}
