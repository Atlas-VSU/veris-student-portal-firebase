import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentFormData } from "@/lib/validators";

interface SuccessScreenProps {
  form: PaymentFormData;
  onReset: () => void;
  paymentHistoryId?: string;
  submissionCount?: number;
}

export function SuccessScreen({
  form,
  onReset,
  paymentHistoryId,
  submissionCount = 0,
}: SuccessScreenProps) {
  const summary = [
    ["Student",        form.userName],
    ["Student ID",     form.studentId],
    ["Amount",         `₱${parseFloat(String(form.amount)).toLocaleString()}`],
    ["Payment Method", form.paymentMethod.replace("_", " ")],
    ...(form.referenceNumber ? [["Reference No.", form.referenceNumber]] : []),
    ...(submissionCount > 0 ? [["Items Submitted", String(submissionCount)]] : []),
    ...(paymentHistoryId ? [["Request ID", paymentHistoryId]] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Organic Blurred Blobs */}
      <div className="absolute top-1/4 -left-32 w-[25rem] h-[25rem] bg-primary/10 rounded-full blur-3xl pointer-events-none blob-shape-1 animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-[25rem] h-[25rem] bg-secondary/10 rounded-full blur-3xl pointer-events-none blob-shape-2 animate-float-delayed" />

      <Card className="w-full max-w-md border-border/50 bg-card shadow-soft relative z-10">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold font-serif text-primary">Payment Submitted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Payment for{" "}
              <span className="font-bold text-foreground">{form.userName}</span>{" "}
              has been submitted and is pending review.
            </p>
          </div>

          <Separator className="bg-border/50" />

          <div className="w-full rounded-2xl bg-primary/5 border border-border p-4 text-left space-y-2">
            {summary.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-1 text-sm font-medium">
                <span className="text-muted-foreground leading-snug">{k}</span>
                <span className="max-w-[11rem] text-right font-bold text-foreground capitalize break-words leading-snug">{v}</span>
              </div>
            ))}
          </div>

          <Button onClick={onReset} className="w-full">
            Submit Another Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
