"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ArrowLeft, BookOpen, Building2, Receipt, AlertCircle, CheckCircle2, Loader2, UserCircle } from "lucide-react";
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
  /** True while the parent is re-fetching dues — coming back to this step
   *  reloads them, and without this the stale amounts sit there unmarked. */
  isLoading?: boolean;
  onBack: () => void;
  onNext: (selectedItems: {
    fees: FeeItem[];
    fines: Fine[];
    fineItems: FineItem[];
    feeAmount: number;
    fineAmount: number;
    totalAmount: number;
  }) => void | Promise<void>;
}

export default function FinesFeesSelectionPage({
  studentData,
  organizationData,
  currentStep,
  fees,
  fines,
  fineItems,
  isLoading = false,
  onBack,
  onNext,
  selectedTerm,
}: FinesFeesSelectionPageProps) {
  // Selection is per item. It used to be two all-or-nothing switches, so a
  // student who could only afford one fine had to pay every fine at once.
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
  const [selectedFineItemIds, setSelectedFineItemIds] = useState<Set<string>>(new Set());
  const [isAdvancing, setIsAdvancing] = useState(false);

  const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });

  const toggleFee = toggleId(setSelectedFeeIds);
  const toggleFineItem = toggleId(setSelectedFineItemIds);

  const getPaymentStatus = (item: {
    isPayable?: boolean;
    paymentState?: "unpaid" | "pending" | "rejected" | "verified";
    latestRejectionReason?: string;
  }) => {
    if (item.paymentState === "verified") {
      return {
        label: "Approved",
        className: "border-green-600/20 bg-green-600/10 text-green-700",
      };
    }
    if (item.paymentState === "pending" || (!item.isPayable && item.paymentState !== "rejected")) {
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

  const payableFees = useMemo(() => fees.filter((fee) => fee.isPayable !== false), [fees]);
  // `isPayable` is computed per item on the server from that item's own flags.
  // Filtering on `!isPending` alone counted settled items as payable now that
  // the API returns them, so the student could see paid fines offered for
  // payment again.
  const payableFineItems = useMemo(
    () => fineItems.filter((fine) => (fine.isPayable ?? !fine.isPending) && !fine.isPaid),
    [fineItems]
  );
  const pendingFines = useMemo(() => fineItems.filter((fine) => fine.isPending === true), [fineItems]);
  const payableFines = useMemo(() => payableFineItems.length > 0 ? fines : [], [fines, payableFineItems]);

  // The card headers show what is still OWED. They used to sum every row
  // including settled ones, so the header total silently disagreed with the
  // "Pay All" figure directly beneath it with nothing to explain the gap.
  const feesTotal = useMemo(() => {
    return payableFees.reduce((sum, fee) => sum + fee.amount, 0);
  }, [payableFees]);

  const finesTotal = useMemo(() => {
    return payableFineItems.reduce((sum, fine) => sum + fine.amount, 0);
  }, [payableFineItems]);

  // ── What the student has actually ticked ──────────────────────────────────
  const selectedFees = useMemo(
    () => payableFees.filter((fee) => selectedFeeIds.has(fee.id)),
    [payableFees, selectedFeeIds]
  );

  const selectedFineItems = useMemo(
    () => payableFineItems.filter((item) => selectedFineItemIds.has(item.refId)),
    [payableFineItems, selectedFineItemIds]
  );

  const feesPayableTotal = useMemo(
    () => selectedFees.reduce((sum, fee) => sum + fee.amount, 0),
    [selectedFees]
  );

  const finesPayableTotal = useMemo(
    () => selectedFineItems.reduce((sum, item) => sum + item.amount, 0),
    [selectedFineItems]
  );

  const fineById = useMemo(() => {
    return new Map(fines.map((fine) => [fine.id, fine]));
  }, [fines]);

  // Only the parent fines the chosen items actually belong to — the payment
  // step reads this list, so carrying unrelated fines through would attach the
  // wrong parent to the submission.
  const selectedParentFines = useMemo(() => {
    const parentIds = new Set(selectedFineItems.map((item) => item.parentFineId));
    return fines.filter((fine) => parentIds.has(fine.id));
  }, [fines, selectedFineItems]);

  const grandTotal = feesPayableTotal + finesPayableTotal;

  const handleContinue = async () => {
    if (isAdvancing) return;
    if (selectedFees.length === 0 && selectedFineItems.length === 0) return;

    // Awaited so the button reports progress rather than going dead if the
    // parent ever loads anything before advancing.
    setIsAdvancing(true);
    try {
      await onNext({
        fees: selectedFees,
        fines: selectedParentFines,
        fineItems: selectedFineItems,
        feeAmount: feesPayableTotal,
        fineAmount: finesPayableTotal,
        totalAmount: grandTotal,
      });
    } finally {
      setIsAdvancing(false);
    }
  };

  // A student the roster sync has retired is no longer enrolled, so their
  // records are history to review rather than dues to settle. Nothing here is
  // selectable, and `submit-payment` refuses them server-side regardless.
  const isViewOnly = studentData.isArchived === true;

  const hasSelection =
    !isViewOnly && (selectedFees.length > 0 || selectedFineItems.length > 0);
  const selectedCount = selectedFees.length + selectedFineItems.length;
  const hasPayableFees = !isViewOnly && payableFees.length > 0;
  const hasPayableFineItems = !isViewOnly && payableFineItems.length > 0;

  // ── Select-all helpers, kept so paying everything is still one click ───────
  const allFeesSelected = hasPayableFees && selectedFees.length === payableFees.length;
  const allFinesSelected =
    hasPayableFineItems && selectedFineItems.length === payableFineItems.length;

  const toggleAllFees = (checked: boolean) =>
    setSelectedFeeIds(checked ? new Set(payableFees.map((fee) => fee.id)) : new Set());

  const toggleAllFineItems = (checked: boolean) =>
    setSelectedFineItemIds(
      checked ? new Set(payableFineItems.map((item) => item.refId)) : new Set()
    );

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
          <CardContent className="px-4 sm:px-6 py-5 space-y-4">
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

        {isViewOnly && (
          <Card className="border-amber-300 bg-amber-50 shadow-soft">
            <CardContent className="px-4 sm:px-6 py-4">
              <p className="text-sm font-bold text-amber-800">
                View only — you are no longer enrolled
              </p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                These are your records and payment history for this term. They are shown
                for reference and cannot be paid against. If you believe this is wrong,
                contact your organization.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Fees Section */}
          <Card className="h-fit bg-card border border-border/50 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl font-bold font-serif">Organization Fees</CardTitle>
                </div>
                <Badge variant="outline" className="text-primary rounded-full font-bold">
                  ₱{feesTotal.toFixed(2)}
                </Badge>
              </div>
              <CardDescription className="text-sm text-muted-foreground">All fees for your organization this semester</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pay All Fees Toggle */}
              {fees.length > 0 && (
                <>
                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${
                      allFeesSelected
                        ? "bg-primary/10 border-primary shadow-soft"
                        : hasPayableFees
                          ? "bg-white/50 border-border hover:bg-primary/5 cursor-pointer"
                          : "bg-muted/30 border-border opacity-70 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!hasPayableFees) return;
                      toggleAllFees(!allFeesSelected);
                    }}
                  >
                    <Checkbox
                      id="pay-all-fees"
                      checked={allFeesSelected}
                      disabled={!hasPayableFees}
                      onCheckedChange={(checked) => {
                        if (!hasPayableFees) return;
                        toggleAllFees(checked === true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border-border bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary/30"
                    />
                    <span className="text-sm font-bold leading-snug flex-1 min-w-0 text-foreground">
                      Select All Fees
                      {selectedFees.length > 0 && !allFeesSelected && (
                        <span className="ml-2 font-medium text-muted-foreground">
                          ({selectedFees.length} of {payableFees.length} selected)
                        </span>
                      )}
                    </span>
                    <span className="text-lg font-bold text-primary shrink-0 tabular-nums">
                      ₱{feesPayableTotal.toFixed(2)}
                    </span>
                  </div>
                  {!hasPayableFees && (
                    <p className="text-xs text-amber-600 px-1 font-medium">
                      {fees.some(f => f.paymentState === "pending")
                        ? "All fee items are currently pending verification or verified and cannot be selected."
                        : "All fee items are already verified and cannot be selected."}
                    </p>
                  )}
                  <Separator className="bg-border/50" />
                  <p className="text-xs text-muted-foreground px-1 font-medium">Fee Breakdown:</p>
                </>
              )}

              {/* Fee Items Breakdown */}
              <div className="space-y-3">
                {fees.map((fee) => {
                  const isSelectable = !isViewOnly && fee.isPayable !== false;
                  const isSelected = selectedFeeIds.has(fee.id);

                  return (
                  <div
                    key={fee.id}
                    role={isSelectable ? "button" : undefined}
                    tabIndex={isSelectable ? 0 : undefined}
                    onClick={() => isSelectable && toggleFee(fee.id)}
                    onKeyDown={(event) => {
                      if (!isSelectable) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleFee(fee.id);
                      }
                    }}
                    className={`flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-colors ${
                      !isSelectable
                        ? "bg-secondary/5 border-border/50"
                        : isSelected
                          ? "bg-primary/10 border-primary cursor-pointer"
                          : "bg-white/50 border-border/30 hover:bg-primary/5 cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!isSelectable}
                      aria-label={`Select ${fee.description}`}
                      onCheckedChange={() => isSelectable && toggleFee(fee.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded-md border-border bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary/30"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{fee.description}</p>
                        {(() => {
                          const status = getPaymentStatus(fee);
                          return (
                            <Badge variant="outline" className={`rounded-full font-bold uppercase text-[11px] ${status.className}`}>
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
                      {/* A fee that was declined, resubmitted and approved
                          showed "Approved" alongside the old rejection reason.
                          Only surface it while the fee is actually declined. */}
                      {fee.latestRejectionReason && fee.paymentState === "rejected" && (
                        <p className="text-xs text-destructive font-medium">
                          Last rejected reason: {fee.latestRejectionReason}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0 tabular-nums">
                      ₱{fee.amount.toFixed(2)}
                    </span>
                  </div>
                  );
                })}
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
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${
                      allFinesSelected
                        ? "bg-secondary/10 border-secondary shadow-soft"
                        : hasPayableFineItems
                          ? "bg-white/50 border-border hover:bg-secondary/5 cursor-pointer"
                          : "bg-muted/30 border-border opacity-70 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!hasPayableFineItems) return;
                      toggleAllFineItems(!allFinesSelected);
                    }}
                  >
                    <Checkbox
                      id="pay-all-fines"
                      checked={allFinesSelected}
                      disabled={!hasPayableFineItems}
                      onCheckedChange={(checked) => {
                        if (!hasPayableFineItems) return;
                        toggleAllFineItems(checked === true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border-border bg-white data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground focus-visible:ring-secondary/30"
                    />
                    <span className="text-sm font-bold leading-snug flex-1 min-w-0 text-foreground">
                      Select All Fines
                      {selectedFineItems.length > 0 && !allFinesSelected && (
                        <span className="ml-2 font-medium text-muted-foreground">
                          ({selectedFineItems.length} of {payableFineItems.length} selected)
                        </span>
                      )}
                    </span>
                    <span className="text-lg font-bold text-secondary shrink-0 tabular-nums">
                      ₱{finesPayableTotal.toFixed(2)}
                    </span>
                  </div>
                  {!hasPayableFineItems && (
                    <p className="text-xs text-amber-600 px-1 font-medium">
                      {fineItems.some(f => f.isPending)
                        ? "All fine items are currently pending verification or verified and cannot be selected."
                        : "All fine items are already verified and cannot be selected."}
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
                  // The item's own state, computed server-side from its own
                  // flags. It used to read the PARENT's rejection, so one
                  // declined submission marked every unpaid item under that
                  // fine "Declined" — including items raised afterwards that
                  // were never submitted at all.
                  const status = getPaymentStatus({
                    isPayable: fine.isPayable ?? !fine.isPending,
                    paymentState: fine.paymentState ?? (fine.isPending ? "pending" : "unpaid"),
                    latestRejectionReason: fine.latestRejectionReason,
                  });

                  const isSelectable = !isViewOnly && (fine.isPayable ?? !fine.isPending) && !fine.isPaid;
                  const isSelected = selectedFineItemIds.has(fine.refId);

                  return (
                    <div
                      key={fine.refId}
                      role={isSelectable ? "button" : undefined}
                      tabIndex={isSelectable ? 0 : undefined}
                      onClick={() => isSelectable && toggleFineItem(fine.refId)}
                      onKeyDown={(event) => {
                        if (!isSelectable) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleFineItem(fine.refId);
                        }
                      }}
                      className={`flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-colors ${
                        !isSelectable
                          ? "bg-secondary/5 border-border/50"
                          : isSelected
                            ? "bg-secondary/10 border-secondary cursor-pointer"
                            : "bg-white/50 border-border/30 hover:bg-secondary/5 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={!isSelectable}
                        aria-label={`Select ${fine.title}`}
                        onCheckedChange={() => isSelectable && toggleFineItem(fine.refId)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 rounded-md border-border bg-white data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground focus-visible:ring-secondary/30"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{fine.title}</p>
                          <Badge variant="outline" className={`rounded-full font-bold uppercase text-[11px] ${status.className}`}>
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
                        {fine.isPaid && !fine.isPending && (
                          <p className="text-xs text-green-700 font-medium">
                            {fine.isWaived ? "Waived by the organization" : "Settled"}
                          </p>
                        )}
                        {/* Only the items that were actually in the declined
                            submission carry its reason. */}
                        {fine.latestRejectionReason && !fine.isPending && (
                          <p className="text-xs text-destructive font-medium">
                            Last rejected reason: {fine.latestRejectionReason}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-secondary shrink-0 tabular-nums">
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
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-[#FDFCF8]/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-float">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              {isViewOnly ? (
                <>
                  <p className="text-xs text-muted-foreground font-medium">
                    Outstanding on record for this term
                  </p>
                  <p className="text-2xl font-bold font-serif text-muted-foreground">
                    ₱{(feesTotal + finesTotal).toFixed(2)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isLoading
                      ? "Refreshing your dues…"
                      : selectedCount > 0
                        ? `Total for ${selectedCount} selected item${selectedCount === 1 ? "" : "s"}`
                        : "Select the items you want to pay"}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-primary tabular-nums">₱{grandTotal.toFixed(2)}</p>
                </>
              )}
            </div>
            {isViewOnly ? (
              <Button variant="outline" onClick={onBack} className="shrink-0 px-6 sm:px-8">
                Back to Terms
              </Button>
            ) : (
              <Button
                onClick={handleContinue}
                disabled={!hasSelection || isAdvancing || isLoading}
                className="shrink-0 px-6 sm:px-8 gap-2"
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
