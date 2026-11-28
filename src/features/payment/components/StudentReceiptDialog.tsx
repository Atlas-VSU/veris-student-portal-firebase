"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Building2, Download, Loader2 } from "lucide-react";
import {
  downloadReceiptAsPng,
  formatPaymentMethodLabel,
  formatReceiptDate,
} from "../receipt-print";
import { StudentReceiptData } from "../types";

interface StudentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: StudentReceiptData | null;
}

export function StudentReceiptDialog({
  open,
  onOpenChange,
  data,
}: StudentReceiptDialogProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!data) return null;

  const logoFailed = Boolean(data.orgLogoUrl && failedLogoUrl === data.orgLogoUrl);
  const formattedDate = formatReceiptDate(data.date);
  const formattedMethod = formatPaymentMethodLabel(data.paymentMethod, true);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadReceiptAsPng(data, !logoFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Payment Receipt</DialogTitle>
          <DialogDescription>
            Official payment receipt — you can download a copy of this receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-xl p-6 bg-white text-black text-sm max-w-sm mx-auto w-full shadow-xs">
          {/* Header */}
          <div className="text-center mb-4">
            {data.orgLogoUrl && !logoFailed ? (
              <div className="w-11 h-11 mx-auto mb-2 relative rounded-full overflow-hidden bg-white">
                <img
                  src={data.orgLogoUrl}
                  alt={`${data.orgAcronym} Logo`}
                  onError={() => data.orgLogoUrl && setFailedLogoUrl(data.orgLogoUrl)}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="w-11 h-11 mx-auto mb-2 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <p className="font-bold text-base leading-tight mb-1">{data.orgName}</p>
            <p className="text-xs text-gray-600">Visayas State University - Baybay Main Campus</p>
            <p className="text-xs text-gray-500 mt-0.5">Official Payment Receipt</p>
          </div>

          <Separator className="my-3 bg-gray-200" />

          {/* Receipt meta */}
          <div className="flex justify-between text-xs gap-2">
            <span className="text-gray-500">Receipt No.</span>
            <span className="font-semibold font-mono text-right">{data.receiptId}</span>
          </div>
          <div className="flex justify-between text-xs mt-1 gap-2">
            <span className="text-gray-500">Date</span>
            <span className="text-right">{formattedDate}</span>
          </div>
          <div className="flex justify-between text-xs mt-1 gap-2">
            <span className="text-gray-500">Term</span>
            <span className="text-right">
              {data.semester} Semester, A.Y. {data.AY}
            </span>
          </div>

          <Separator className="my-3 bg-gray-200" />

          {/* Student info */}
          <div className="space-y-0.5">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Received From</p>
            <p className="font-semibold text-sm">{data.studentName}</p>
            <p className="text-xs font-mono text-gray-600">{data.studentId}</p>
          </div>

          <Separator className="my-3 bg-gray-200" />

          {/* Items */}
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Items Paid</p>
            {data.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs gap-2">
                <span className="flex-1 leading-snug">
                  {item.name}
                  <span className="text-gray-500"> ({item.type})</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-3 bg-gray-200" />

          {/* Total */}
          <div className="flex justify-between font-bold text-base">
            <span>Total Paid</span>
            <span className="tabular-nums">
              ₱{data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <Separator className="my-4 bg-gray-200" />

          {/* Footer */}
          <div className="text-center text-xs space-y-1 text-gray-600">
            <p>Payment Method: {formattedMethod}</p>
            <p>Verified by {data.verifiedByName}</p>
          </div>

          <div className="mt-5 text-center text-[11px] text-gray-500">
            This serves as an official proof of payment.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="default"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
