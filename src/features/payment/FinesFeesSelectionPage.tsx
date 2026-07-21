"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ArrowLeft, BookOpen, Building2, Receipt, AlertCircle, CheckCircle2, UserCircle } from "lucide-react";
import { PaymentBrandHeader } from "./components/PaymentBrandHeader";
import { PaymentProgressBar } from "./components/PaymentProgressBar";
import { StudentData, TermData, OrganizationData, FeeItem, Fine, FineItem } from "./types";

interface FinesFeesSelectionPageProps {
  studentData: StudentData;
  selectedTerm: TermData | null;
  organizationData: OrganizationData;
  currentStep: 1 | 2 | 3 | 4 | 5;
  fees: FeeItem[];
  fines: Fine[];
  fineItems: FineItem[];
  onBack: () => void;
  onNext: (selectedItems: {
    fees: FeeItem[];
    fines: Fine[];
    fineItems: FineItem[];
    feeAmount: number;
    fineAmount: number;
    totalAmount: number;
  }) => void;
}

export default function FinesFeesSelectionPage({
  studentData,
  organizationData,
  currentStep,
  fees,
  fines,
  fineItems,
  onBack,
  onNext,
  selectedTerm,
}: FinesFeesSelectionPageProps) {
  const [payFees, setPayFees] = useState(false);
  const [payFines, setPayFines] = useState(false);

  const getPaymentStatus = (item: {
    isPayable?: boolean;
    paymentState?: "unpaid" | "pending" | "rejected";
    latestRejectionReason?: string;
  }) => {
    if (item.paymentState === "pending" || item.isPayable === false) {
      return {
        label: "Pending",
        className: "border-secondary/20 bg-secondary/10 text-secondary",
      };
    }

    if (item.paymentState === "rejected" || item.latestRejectionReason) {
      return {
        label: "Declined",
        className: "border-destructive/20 bg-destructive/10 text-destructive",
      };
    }

    return {
      label: "Payable",
      className: "border-primary/20 bg-primary/10 text-primary",
    };
  };

  const formatDisplayDate = (value?: unknown) => {
    if (!value) return null;

    if (
      typeof value === "object" &&
      value !== null &&
      "_seconds" in value &&
      typeof (value as { _seconds?: unknown })._seconds === "number"
    ) {
      const seconds = (value as { _seconds: number })._seconds;
      return new Date(seconds * 1000).toLocaleDateString();
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toLocaleDateString();
    }

    if (typeof value !== "string") return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  // Calculate totals
  const feesTotal = useMemo(() => {
    return fees.reduce((sum, fee) => sum + fee.amount, 0);
  }, [fees]);

  const finesTotal = useMemo(() => {
    return fineItems.reduce((sum, fine) => sum + fine.amount, 0);
  }, [fineItems]);

  const payableFees = useMemo(() => fees.filter((fee) => fee.isPayable !== false), [fees]);
  const payableFineItems = useMemo(() => fineItems.filter((fine) => fine.isPending !== true), [fineItems]);
  const pendingFines = useMemo(() => fineItems.filter((fine) => fine.isPending === true), [fineItems]);
  const payableFines = useMemo(() => payableFineItems.length > 0 ? fines : [], [fines, payableFineItems]);

  const feesPayableTotal = useMemo(() => {
    return payableFees.reduce((sum, fee) => sum + fee.amount, 0);
  }, [payableFees]);

  const finesPayableTotal = useMemo(() => {
    return payableFineItems.reduce((sum, fine) => sum + fine.amount, 0);
  }, [payableFineItems]);

  const fineById = useMemo(() => {
    return new Map(fines.map((fine) => [fine.id, fine]));
  }, [fines]);

  const grandTotal = (payFees ? feesPayableTotal : 0) + (payFines ? finesPayableTotal : 0);

  const handleContinue = () => {
    if (payFees || payFines) {
      onNext({
        fees: payFees ? payableFees : [],
        fines: payFines ? payableFines : [],
        fineItems: payFines ? fineItems : [],
        feeAmount: payFees ? feesPayableTotal : 0,
        fineAmount: payFines ? finesPayableTotal : 0,
        totalAmount: grandTotal,
      });
    }
  };

  const hasSelection = payFees || payFines;
  const hasPayableFees = payableFees.length > 0;
  const hasPayableFineItems = payableFineItems.length > 0;

  return (
    <div className="min-h-screen bg-background py-8 pb-36 px-4 relative overflow-hidden font-sans">
      {/* Background Organic Blurred Blobs */}
      <div className="absolute top-1/4 -left-32 w-[25rem] h-[25rem] bg-primary/10 rounded-full blur-3xl pointer-events-none blob-shape-1 animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-[25rem] h-[25rem] bg-secondary/10 rounded-full blur-3xl pointer-events-none blob-shape-2 animate-float-delayed" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <PaymentBrandHeader />
        <PaymentProgressBar
          currentStep={currentStep}
          subtitle="Select the fees and fines you want to pay"
        />
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Organization Selection
        </Button>

        {/* Term, Student & Organization Info Banner Card */}
        <Card className="border-border bg-primary/5 shadow-soft">
          <CardContent className="py-5 space-y-4">
            {/* Term Row */}
            {selectedTerm && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-bold text-base leading-tight truncate text-foreground">
                      {selectedTerm.semester} Semester · A.Y. {selectedTerm.AY}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Payment Term</p>
                  </div>
                </div>
                <Separator className="bg-border/50" />
              </>
            )}

            {/* Student row */}
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-bold text-lg leading-tight truncate text-foreground">{studentData.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                  <span className="font-mono font-bold text-foreground/80">{studentData.studentId}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {studentData.programAcronym || studentData.programShortName || studentData.program}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            
            <Separator className="bg-border/50" />
            
            {/* Organization row */}
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-bold text-base leading-tight text-foreground">{organizationData.acronym}</p>
                <p className="text-xs text-muted-foreground truncate font-medium">{organizationData.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Fees Section */}
          <Card className="h-fit bg-card border border-border/50 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl font-bold font-serif">Membership Fees</CardTitle>
                </div>
                <Badge variant="outline" className="text-primary rounded-full font-bold">
                  ₱{feesTotal.toFixed(2)}
                </Badge>
              </div>
              <CardDescription className="text-sm text-muted-foreground">Required membership and registration fees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pay All Fees Toggle */}
              {fees.length > 0 && (
                <>
                  <div
                    className={`flex items-center space-x-3 p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${
                      payFees
                        ? "bg-primary/10 border-primary shadow-soft"
                        : hasPayableFees
                          ? "bg-white/50 border-border hover:bg-primary/5 cursor-pointer"
                          : "bg-muted/30 border-border opacity-70 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!hasPayableFees) return;
                      setPayFees(!payFees);
                    }}
                  >
                    <Checkbox
                      id="pay-all-fees"
                      checked={payFees}
                      disabled={!hasPayableFees}
                      onCheckedChange={(checked) => {
                        if (!hasPayableFees) return;
                        setPayFees(checked === true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border-border bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary/30"
                    />
                    <span className="text-sm font-bold leading-none flex-1 text-foreground">
                      Pay All Fees
                    </span>
                    <span className="text-lg font-bold text-primary">
                      ₱{feesPayableTotal.toFixed(2)}
                    </span>
                  </div>
                  {!hasPayableFees && (
                    <p className="text-xs text-amber-600 px-1 font-medium">
                      All fee items are currently pending verification and cannot be selected.
                    </p>
                  )}
                  <Separator className="bg-border/50" />
                  <p className="text-xs text-muted-foreground px-1 font-medium">Fee Breakdown:</p>
                </>
              )}

              {/* Fee Items Breakdown */}
              <div className="space-y-3">
                {fees.map((fee) => (
                  <div
                    key={fee.id}
                    className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${
                      fee.isPayable === false ? "bg-secondary/5 border-border/50" : "bg-white/50 border-border/30"
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{fee.description}</p>
                        {(() => {
                          const status = getPaymentStatus(fee);
                          return (
                            <Badge variant="outline" className={`rounded-full font-bold uppercase text-[9px] ${status.className}`}>
                              {status.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      {formatDisplayDate(fee.dueDate) && (
                        <p className="text-xs text-muted-foreground font-medium">Due: {formatDisplayDate(fee.dueDate)}</p>
                      )}
                      {fee.paymentState === "pending" && (
                        <p className="text-xs text-amber-600 font-medium">
                          Status: Pending verification (not selectable)
                        </p>
                      )}
                      {fee.latestRejectionReason && (
                        <p className="text-xs text-destructive font-medium">
                          Last rejected reason: {fee.latestRejectionReason}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary ml-4">
                      ₱{fee.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {fees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-primary" />
                  <p className="text-sm font-medium">No outstanding fees</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fines Section */}
          <Card className="h-fit bg-card border border-border/50 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-secondary" />
                  <CardTitle className="text-xl font-bold font-serif">Fines & Penalties</CardTitle>
                </div>
                <Badge variant="outline" className="text-secondary rounded-full font-bold">
                  ₱{finesTotal.toFixed(2)}
                </Badge>
              </div>
              <CardDescription className="text-sm text-muted-foreground">Outstanding fines and penalty charges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pay All Fines Toggle */}
              {(pendingFines.length > 0 || payableFines.length > 0) && (
                <>
                  <div
                    className={`flex items-center space-x-3 p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${
                      payFines
                        ? "bg-secondary/10 border-secondary shadow-soft"
                        : hasPayableFineItems
                          ? "bg-white/50 border-border hover:bg-secondary/5 cursor-pointer"
                          : "bg-muted/30 border-border opacity-70 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!hasPayableFineItems) return;
                      setPayFines(!payFines);
                    }}
                  >
                    <Checkbox
                      id="pay-all-fines"
                      checked={payFines}
                      disabled={!hasPayableFineItems}
                      onCheckedChange={(checked) => {
                        if (!hasPayableFineItems) return;
                        setPayFines(checked === true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border-border bg-white data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground focus-visible:ring-secondary/30"
                    />
                    <span className="text-sm font-bold leading-none flex-1 text-foreground">
                      Pay All Fines
                    </span>
                    <span className="text-lg font-bold text-secondary">
                      ₱{finesPayableTotal.toFixed(2)}
                    </span>
                  </div>
                  {!hasPayableFineItems && (
                    <p className="text-xs text-amber-600 px-1 font-medium">
                      All fine items are currently pending verification and cannot be selected.
                    </p>
                  )}
                  <Separator className="bg-border/50" />
                  <p className="text-xs text-muted-foreground px-1 font-medium">Fines Breakdown:</p>
                </>
              )}

              {/* Fine Items Breakdown */}
              <div className="space-y-3">
                {fineItems.map((fine) => {
                  const parentFine = fineById.get(fine.parentFineId);
                  const status = getPaymentStatus({
                    isPayable: !fine?.isPending,
                    paymentState: parentFine?.latestRejectionReason ? "rejected" : fine.isPending ? "pending" : "unpaid",
                    latestRejectionReason: parentFine?.latestRejectionReason,
                  });

                  return (
                    <div
                      key={fine.refId}
                      className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${
                        fine.isPending ? "bg-secondary/5 border-border/50" : "bg-white/50 border-border/30"
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{fine.title}</p>
                          <Badge variant="outline" className={`rounded-full font-bold uppercase text-[9px] ${status.className}`}>
                            {status.label}
                          </Badge>
                        </div>
                        {formatDisplayDate(fine.date) && (
                          <p className="text-xs text-muted-foreground font-medium">Date: {formatDisplayDate(fine.date)}</p>
                        )}
                        {parentFine?.reason && (
                          <p className="text-xs text-muted-foreground italic font-medium">{parentFine.reason}</p>
                        )}
                        {fine.isPending && (
                          <p className="text-xs text-amber-600 font-medium">
                            Status: Pending verification (not selectable)
                          </p>
                        )}
                        {parentFine?.latestRejectionReason && !fine.isPending && (
                          <p className="text-xs text-destructive font-medium">
                            Last rejected reason: {parentFine.latestRejectionReason}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-secondary ml-4">
                        ₱{fine.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!hasPayableFineItems && pendingFines.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-primary" />
                  <p className="text-sm font-medium">No outstanding fines</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Floating Checkout Bar at the Bottom */}
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-[#FDFCF8]/95 backdrop-blur-md px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-float">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
              <p className="text-2xl font-bold font-serif text-primary">₱{grandTotal.toFixed(2)}</p>
            </div>
            <Button
              onClick={handleContinue}
              disabled={!hasSelection}
              className="px-8"
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
