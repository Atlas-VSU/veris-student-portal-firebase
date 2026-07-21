"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, AlertCircle, ArrowLeft, BookOpen, Building2, CheckCircle, Copy, CreditCard, Info, Loader2, Phone, Receipt, ShieldAlert, User, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

import { SuccessScreen } from "./components/SuccessScreen";
import { PaymentFormData } from "@/lib/validators";
import { usePaymentForm, ImageData } from "./hooks/usePaymentForm";
import { ImageUpload } from "./components/ImageUpload";
import { SelectedPaymentItems, StudentData, TermData, OrganizationData } from "./types";
import { PaymentBrandHeader } from "./components/PaymentBrandHeader";
import { PaymentProgressBar } from "./components/PaymentProgressBar";

interface FinesPaymentFormPageProps {
  studentData?: StudentData;
  organizationData?: OrganizationData;
  selectedTerm?: TermData | null;
  selectedPaymentItems?: SelectedPaymentItems;
  currentStep: 1 | 2 | 3 | 4 | 5;
  onBack?: () => void;
  onRestart?: () => void;
}

interface PublicSubmitResult {
  paymentHistoryId: string;
  submissionIds: string[];
}

interface PaymentDraft {
  form: Partial<PaymentFormData>;
  image?: {
    name: string;
    type: string;
    preview?: string;
  } | null;
}

export default function FinesPaymentFormPage({
  studentData,
  selectedTerm,
  organizationData,
  selectedPaymentItems,
  currentStep,
  onBack,
  onRestart,
}: FinesPaymentFormPageProps) {
  const isContextualFlow = Boolean(studentData && organizationData && selectedPaymentItems);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<PublicSubmitResult | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [showAuditorQr, setShowAuditorQr] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<number | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const selectedFineItems = selectedPaymentItems?.fineItems.filter(f => !f.isPending) ?? [];

  const selectedTypes = useMemo(() => {
    if (!selectedPaymentItems) return [] as Array<"fees" | "fines">;
    return [
      ...(selectedPaymentItems.fees.length > 0 ? (["fees"] as const) : []),
      ...(selectedFineItems.length > 0 ? (["fines"] as const) : []),
    ];
  }, [selectedPaymentItems, selectedFineItems.length]);

  const draftStorageKey = useMemo(() => {
    const studentKey = studentData?.studentId ?? "anonymous";
    const orgKey = organizationData?.id ?? "general";
    return `public-payment-draft:${studentKey}:${orgKey}`;
  }, [organizationData?.id, studentData?.studentId]);

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(draftStorageKey);
  };

  const persistDraft = (draft: PaymentDraft) => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setLastDraftSavedAt(Date.now());
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        try {
          const fallbackDraft: PaymentDraft = {
            ...draft,
            image: draft.image
              ? {
                name: draft.image.name,
                type: draft.image.type,
              }
              : null,
          };

          window.sessionStorage.setItem(draftStorageKey, JSON.stringify(fallbackDraft));
          setLastDraftSavedAt(Date.now());
          return;
        } catch {
          window.sessionStorage.removeItem(draftStorageKey);
        }
      }

      console.warn("Failed to persist payment draft:", error);
    }
  };

  const handleContextualSubmit = async (data: PaymentFormData, image: ImageData | null) => {
    setSubmitError(null);
    setSubmitResult(null);
    setReceiptError(null);

    if (!image?.file) {
      const msg = "Receipt image is required before submitting payment.";
      setReceiptError(msg);
      setSubmitError(msg);
      throw new Error(msg);
    }

    let imageUrl = "";
    if (image?.file) {
      const fd = new FormData();
      fd.append("file", image.file);
      fd.append("studentId", studentData!.studentId);
      const uploadRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok || !uploadResult.success) {
        const msg = uploadResult.error ?? "Failed to upload receipt image.";
        setSubmitError(msg);
        throw new Error(msg);
      }
      imageUrl = uploadResult.url as string;
    }

    const unpaidDues = [
      ...(selectedPaymentItems?.fees ?? []).map(fee => ({
        refId: fee.id,
        title: fee.description,
        amount: fee.amount,
        paymentType: "fees",
        parentFineId: "",
        academicYear: fee.academicYear || selectedTerm?.AY || "2026-2027",
        semester: fee.semester || selectedTerm?.semester || "1st",
      })),
      ...(selectedFineItems.filter(f => !f.isPaid && !f.isPending) ?? []).map(fine => ({
        refId: fine.refId,
        title: fine.title,
        amount: fine.amount,
        paymentType: "fines",
        parentFineId: fine.parentFineId,
        academicYear: fine.academicYear || selectedTerm?.AY || "2026-2027",
        semester: fine.semester || selectedTerm?.semester || "1st",
      })),
    ];

    let referenceId = "bulk_transaction";
    if (selectedPaymentItems?.fees.length === 1 && selectedFineItems.length === 0) {
      referenceId = selectedPaymentItems.fees[0].id;
    } else if (selectedFineItems.length === 1 && selectedPaymentItems?.fees.length === 0) {
      referenceId = selectedPaymentItems.fines[0].id;
    }

    const res = await fetch("/api/submit-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: data.userName,
        studentId: data.studentId,
        orgId: organizationData!.id,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        senderNumber: data.senderNumber,
        imageUrl,
        notes: data.notes,
        type: selectedTypes.length === 1 ? selectedTypes[0] : "bulk",
        referenceId,
        dues: unpaidDues,
      }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      const msg = result.error ?? "Payment submission failed. Please try again.";
      setSubmitError(msg);
      throw new Error(msg);
    }

    setSubmitResult({
      paymentHistoryId: result.paymentHistoryId,
      submissionIds: result.submissionIds || [],
    });
    clearDraft();
  };

  const {
    form,
    image, setImage,
    status,
    needsRef, isGcash,
    handleReset,
    onSubmit,
  } = usePaymentForm({
    initialValues: {
      userName: studentData?.name ?? "",
      studentId: studentData?.studentId ?? "",
      amount: selectedPaymentItems?.totalAmount ?? 0,
      type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
    },
    onSubmitPayment: isContextualFlow ? handleContextualSubmit : undefined,
  });

  const { register, formState: { errors }, watch } = form;
  const watchedAmount = Number(watch("amount") ?? 0);
  const mobileTotal = isContextualFlow
    ? Number(selectedPaymentItems?.totalAmount ?? 0)
    : (Number.isFinite(watchedAmount) ? watchedAmount : 0);
  const feeCount = selectedPaymentItems?.fees.length ?? 0;
  const fineCount = selectedFineItems.length ?? 0;

  const treasurerName = organizationData?.orgTreasurerName || "Kleenie Elumene B. Yuzon";
  const treasurerNumber = organizationData?.orgTreasurerNumber || "failed to load";
  const auditorName = organizationData?.orgAuditorName || "Reniel Emberso";
  const auditorNumber = organizationData?.orgAuditorNumber || "failed to load";

  useEffect(() => {
    let cancelled = false;

    const restoreDraft = async () => {
      if (typeof window === "undefined") return;

      try {
        const rawDraft = window.sessionStorage.getItem(draftStorageKey);
        if (!rawDraft) {
          setDraftRestored(true);
          return;
        }

        setRestoredFromDraft(true);

        const draft = JSON.parse(rawDraft) as PaymentDraft;

        if (draft.form) {
          form.reset({
            ...form.getValues(),
            ...draft.form,
            userName: studentData?.name ?? draft.form.userName ?? form.getValues("userName"),
            studentId: studentData?.studentId ?? draft.form.studentId ?? form.getValues("studentId"),
            amount: selectedPaymentItems?.totalAmount ?? draft.form.amount ?? form.getValues("amount"),
            type: selectedTypes.length === 1 ? selectedTypes[0] : draft.form.type,
          });
        }

      } catch (error) {
        console.error("Failed to restore payment draft:", error);
      } finally {
        if (!cancelled) {
          setDraftRestored(true);
        }
      }
    };

    void restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [draftStorageKey, form, selectedPaymentItems?.totalAmount, selectedTypes, setImage, studentData?.name, studentData?.studentId]);

  useEffect(() => {
    if (!draftRestored || typeof window === "undefined") return;

    const subscription = form.watch((value) => {
      const draft: PaymentDraft = {
        form: {
          ...value,
          userName: value.userName ?? "",
          studentId: value.studentId ?? "",
          amount: value.amount ?? 0,
          paymentMethod: value.paymentMethod,
          referenceNumber: value.referenceNumber ?? "",
          senderNumber: value.senderNumber ?? "",
          notes: value.notes ?? "",
          type: value.type,
          paymentHistoryId: value.paymentHistoryId,
          referenceId: value.referenceId,
        },
        image: image
          ? {
            name: image.file.name,
            type: image.file.type,
          }
          : null,
      };

      persistDraft(draft);
    });

    return () => subscription.unsubscribe();
  }, [draftRestored, draftStorageKey, form, image]);

  useEffect(() => {
    if (!draftRestored || typeof window === "undefined") return;

    const currentDraft = window.sessionStorage.getItem(draftStorageKey);
    const parsedDraft = currentDraft ? (JSON.parse(currentDraft) as PaymentDraft) : { form: {} };

    persistDraft({
      ...parsedDraft,
      image: image
        ? {
          name: image.file.name,
          type: image.file.type,
        }
        : null,
    });
  }, [draftRestored, draftStorageKey, image]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.visualViewport) return;

    const updateKeyboardOffset = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 120 ? offset : 0);
    };

    updateKeyboardOffset();
    window.visualViewport.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardOffset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

  const handleSuccessReset = () => {
    setSubmitError(null);
    setSubmitResult(null);
    clearDraft();
    handleReset();
    onRestart?.();
  };

  if (status === "success") {
    return (
      <SuccessScreen
        form={form.getValues()}
        onReset={handleSuccessReset}
        paymentHistoryId={submitResult?.paymentHistoryId}
        submissionCount={submitResult?.submissionIds.length ?? 0}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background Organic Blurred Blobs */}
      <div className="absolute top-1/4 -left-32 w-[25rem] h-[25rem] bg-primary/10 rounded-full blur-3xl pointer-events-none blob-shape-1 animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-[25rem] h-[25rem] bg-secondary/10 rounded-full blur-3xl pointer-events-none blob-shape-2 animate-float-delayed" />

      <div className="mx-auto max-w-2xl px-4 py-8 pb-36 relative z-10">
        <PaymentBrandHeader />
        <div className="mb-8">
          <PaymentProgressBar
            currentStep={currentStep}
            subtitle="Review payment details and submit proof of payment"
          />
        </div>

        {onBack && (
          <Button variant="ghost" onClick={onBack} size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Fees &amp; Fines
          </Button>
        )}

        <div className="mb-4">
          {restoredFromDraft && (
            <p className="text-xs text-primary font-bold">
              Draft restored from your previous session.
            </p>
          )}
          {lastDraftSavedAt && (
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Draft saved at {new Date(lastDraftSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {isContextualFlow && studentData && organizationData && selectedPaymentItems && (
          <Card className="mb-6 bg-card border border-border/50 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Term Row */}
              {selectedTerm && (
                <div className="rounded-xl border border-border bg-primary/5 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-bold text-foreground leading-tight">
                        {selectedTerm.semester} Semester · A.Y. {selectedTerm.AY}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-medium">Payment Term</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Organization Row */}
              <div className="rounded-xl border border-border bg-primary/5 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-foreground leading-tight">{organizationData.acronym}</p>
                    <p className="text-xs text-muted-foreground truncate font-medium">{organizationData.name}</p>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown Row */}
              <div className="space-y-3 rounded-xl border border-border/50 bg-white/50 p-4">
                {selectedPaymentItems.feeAmount > 0 && (
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      Fees ({selectedPaymentItems.fees.length} item{selectedPaymentItems.fees.length > 1 ? "s" : ""})
                    </span>
                    <span className="font-bold text-foreground">₱{selectedPaymentItems.feeAmount.toFixed(2)}</span>
                  </div>
                )}
                {selectedPaymentItems.fineAmount > 0 && (
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-secondary" />
                      Fines ({selectedFineItems.length} item{selectedFineItems.length > 1 ? "s" : ""})
                    </span>
                    <span className="font-bold text-foreground">₱{selectedPaymentItems.fineAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between font-bold text-base">
                  <span>Total Due</span>
                  <span className="text-primary font-serif text-lg">₱{selectedPaymentItems.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">

          {/* Section 1 — Student Info */}
          <div>
            <SectionHeading number={1} title="Student Info" />
            <Card className="border border-border/50 bg-card shadow-soft">
              <CardContent className="pt-6 flex flex-col gap-4">
                <input type="hidden" {...register("userName")} />
                <input type="hidden" {...register("studentId")} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-primary/5 px-4 py-3">
                    <p className="text-xs text-muted-foreground font-medium">Full Name</p>
                    <p className="text-sm font-bold text-foreground break-words mt-0.5">{watch("userName") || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-primary/5 px-4 py-3">
                    <p className="text-xs text-muted-foreground font-medium">Student ID</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{watch("studentId") || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2 — Payment Details */}
          <div className="flex flex-col">
            <SectionHeading number={2} title="Payment Details" />
            {isGcash && (
              <Card className="mt-2 border border-secondary/20 bg-secondary/5 shadow-soft">
                <CardContent className="pt-6 flex flex-col items-center gap-6">
                  <p className="text-xs text-muted-foreground self-start flex items-center gap-1.5 font-medium">
                    <CreditCard className="h-4 w-4 text-secondary" />
                    Pay via GCash using either QR code or manual send money
                  </p>

                  {/* QR Code Section */}
                  <div className="border border-border/50 bg-white p-3 rounded-2xl shadow-soft">
                    <img
                      src={organizationData?.orgTreasurerUrl || "/images/public-student-payment/404-QRNOTFOUND.png"}
                      alt={`${treasurerName} GCash Payment QR Code`}
                      className="max-h-72 w-auto object-contain rounded-xl"
                    />
                  </div>

                  {/* GCash Account Details */}
                  <div className="w-full bg-white/90 rounded-2xl p-5 border border-border shadow-soft">
                    <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-secondary" />
                      Treasurer GCash Details
                    </h4>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 p-3 bg-secondary/5 border border-secondary/10 rounded-xl min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-secondary" />
                          <span className="text-xs md:text-sm text-muted-foreground font-medium">Treasurer Name:</span>
                        </div>
                        <span className="font-bold text-sm md:text-base break-words text-left min-[430px]:text-right text-foreground">{treasurerName}</span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 bg-secondary/5 border border-secondary/10 rounded-xl min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-secondary" />
                          <span className="text-xs md:text-sm text-muted-foreground font-medium">GCash Number:</span>
                        </div>
                        <div className="flex w-full items-center justify-between gap-2 min-[430px]:w-auto min-[430px]:justify-end">
                          <span className="font-bold text-sm md:text-base text-foreground">{treasurerNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(treasurerNumber);
                              toast.success("Copied to clipboard!");
                            }}
                            className="p-1.5 hover:bg-secondary/10 rounded-full transition-colors cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5 text-secondary" />
                          </button>
                        </div>
                      </div>
                      <Dialog open={showAuditorQr} onOpenChange={setShowAuditorQr}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-auto w-full whitespace-normal py-3 text-xs leading-snug border-secondary/30 text-secondary hover:bg-secondary/10 sm:text-sm"
                          >
                            Use alternative payment account (Auditor)
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md bg-card text-foreground border border-border/50 rounded-[2rem] p-8 shadow-float overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold font-serif">Alternative GCash Account</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground font-medium">
                              Use the auditor account only if the treasurer account is unavailable.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6">
                            <div className="relative mx-auto max-h-56 w-auto rounded-2xl border border-border bg-white p-3 overflow-hidden shadow-soft flex items-center justify-center">
                              <img
                                src={organizationData?.orgAuditorUrl || "/images/public-student-payment/404-QRNOTFOUND.png"}
                                alt={`${auditorName} GCash Payment QR Code`}
                                className="max-h-48 w-auto object-contain rounded-lg"
                              />
                            </div>

                            <div className="rounded-2xl border border-border bg-secondary/5 p-4 space-y-3 shadow-soft">
                              <div className="flex flex-col gap-1 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between min-[430px]:gap-2">
                                <span className="text-xs text-muted-foreground font-medium">Auditor Name:</span>
                                <span className="text-sm font-bold text-foreground break-words text-left min-[430px]:text-right">{auditorName}</span>
                              </div>
                              <div className="flex flex-col gap-1 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between min-[430px]:gap-2">
                                <span className="text-xs text-muted-foreground font-medium">GCash Number:</span>
                                <div className="flex w-full items-center justify-between gap-2 min-[430px]:w-auto min-[430px]:justify-end">
                                  <span className="text-sm font-bold text-foreground">{auditorNumber}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void navigator.clipboard.writeText(auditorNumber);
                                      toast.success("Copied to clipboard!");
                                    }}
                                    className="rounded-full p-1.5 transition-colors hover:bg-secondary/10 cursor-pointer"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-secondary" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Payment Steps */}
                  <div className="w-full space-y-4">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      How to pay via GCash:
                    </h4>

                    {/* Option 1: QR Code */}
                    <div className="space-y-2 bg-white/50 border border-border/30 rounded-2xl p-4 shadow-soft">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Option 1: Scan QR Code</p>
                      <ol className="space-y-1.5 pl-5 list-decimal text-xs text-muted-foreground font-medium">
                        <li>Open GCash app and tap "Scan QR"</li>
                        <li>Scan the QR code above</li>
                        <li>Verify the account name: <span className="font-bold text-foreground">{treasurerName}</span></li>
                        <li>Enter the amount: <span className="font-bold text-foreground">₱{mobileTotal}</span></li>
                        <li>Add your Student ID as a note (Optional)</li>
                        <li>Complete payment and save reference number</li>
                      </ol>
                    </div>

                    {/* Option 2: Send Money */}
                    <div className="space-y-2 bg-white/50 border border-border/30 rounded-2xl p-4 shadow-soft">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Option 2: Send Money</p>
                      <ol className="space-y-1.5 pl-5 list-decimal text-xs text-muted-foreground font-medium">
                        <li>Open GCash app and tap "Send Money"</li>
                        <li>Enter GCash number: <span className="font-bold text-foreground">{treasurerNumber}</span></li>
                        <li>Verify account name: <span className="font-bold text-foreground">{treasurerName}</span></li>
                        <li>Enter amount: <span className="font-bold text-foreground">₱{mobileTotal}</span></li>
                        <li>Add your Student ID in the message/notes (Optional)</li>
                        <li>Review and confirm payment</li>
                        <li>Save the reference number shown after payment</li>
                      </ol>
                    </div>
                  </div>

                  {/* Important Reminder */}
                  <div className="w-full bg-secondary/5 border border-secondary/20 rounded-[1.5rem] p-4 shadow-soft">
                    <p className="text-xs flex items-start gap-2.5 font-medium leading-relaxed">
                      <span className="text-secondary">📱</span>
                      <span className="text-muted-foreground">
                        <span className="font-bold text-secondary">Important:</span>{' '}
                        Save your GCash reference number. Take a screenshot of the confirmation page and send it to our support for faster verification.
                      </span>
                    </p>
                  </div>

                  {/* Reference Number Reminder */}
                  <p className="font-bold text-primary mt-2 flex items-center justify-center gap-2 text-sm md:text-base text-center">
                    <CheckCircle className="h-5 w-5" />
                    Save your reference number for verification
                  </p>
                </CardContent>
              </Card>
            )}
            <Card className="border border-border/50 bg-card shadow-soft mt-4">
              <CardContent className="pt-6 flex flex-col gap-4">
                <input type="hidden" {...register("amount", { valueAsNumber: true })} />
                <div className="rounded-xl border border-border bg-primary/5 px-4 py-3">
                  <p className="text-xs text-muted-foreground font-medium">Amount</p>
                  <p className="text-base font-bold text-foreground mt-0.5">₱{(Number(watch("amount") ?? 0)).toFixed(2)}</p>
                </div>
                {errors.amount && <FieldError message={errors.amount.message!} />}

                <Separator className="bg-border/50" />

                <input type="hidden" {...register("paymentMethod")} />
                <div className="rounded-xl border border-border bg-primary/5 px-4 py-3">
                  <p className="text-xs text-muted-foreground font-medium">Payment Method</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">GCash</p>
                </div>
                {errors.paymentMethod && <FieldError message={errors.paymentMethod.message!} />}
                {needsRef && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="referenceNumber" className="text-foreground font-bold text-sm">Reference Number <span className="text-primary">*</span></Label>
                      <Input id="referenceNumber" placeholder="e.g. 1234567890" {...register("referenceNumber")}
                        className={errors.referenceNumber ? "border-destructive focus-visible:ring-destructive/30" : ""} />
                      {errors.referenceNumber && <FieldError message={errors.referenceNumber.message!} />}
                    </div>
                    {isGcash && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="senderNumber" className="text-foreground font-bold text-sm">Sender Number <span className="text-primary">*</span></Label>
                        <Input id="senderNumber" placeholder="09XXXXXXXXX" {...register("senderNumber")}
                          className={errors.senderNumber ? "border-destructive focus-visible:ring-destructive/30" : ""} />
                        {errors.senderNumber ? <FieldError message={errors.senderNumber.message!} /> : <p className="text-xs text-muted-foreground font-medium px-2">Must be a valid PH number</p>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Section 3 — Upload Receipt */}
          <div>
            <SectionHeading number={3} title="Upload Receipt" />
            <Card className="border border-border/50 bg-card shadow-soft">
              <CardContent className="pt-6">
                <ImageUpload
                  value={image}
                  onChange={(nextImage) => {
                    setImage(nextImage);
                    if (nextImage?.file) {
                      setReceiptError(null);
                    }
                  }}
                />
                <p className="mt-3 text-xs text-muted-foreground font-medium">Receipt image is required.</p>
                {receiptError && <FieldError message={receiptError} />}
              </CardContent>
            </Card>
          </div>

          {/* Section 4 — Notes */}
          <div>
            <SectionHeading number={4} title="Notes" optional />
            <Card className="border border-border/50 bg-card shadow-soft">
              <CardContent className="pt-6">
                <Textarea id="notes" placeholder="Any additional notes or remarks..." {...register("notes")} rows={3} className="rounded-2xl border-border bg-white/50 focus-visible:ring-primary/30 p-4" />
              </CardContent>
            </Card>
          </div>

          {submitError && (
            <Alert variant="destructive" className="rounded-2xl border border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-semibold">{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Bottom Floating Bar */}
          <div
            className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-[#FDFCF8]/95 backdrop-blur-md px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-float"
            style={{ bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 0 }}
          >
            <div className="mx-auto max-w-2xl">
              {status === "submitting" ? (
                <div className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 flex items-center justify-center gap-2 font-bold shadow-soft">
                  <Loader2 className="size-5 animate-spin" />
                  Submitting payment…
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
                    {isContextualFlow && (
                      <p className="text-[10px] text-muted-foreground font-medium">Includes {feeCount} fees + {fineCount} fines</p>
                    )}
                    <p className="text-2xl font-bold font-serif text-primary">₱{mobileTotal.toFixed(2)}</p>
                  </div>
                  <Button
                    type="submit"
                    disabled={!image?.file}
                    className="px-8"
                  >
                    Submit Payment
                  </Button>
                </div>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1.5 mt-1.5 font-bold">
      <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">!</span>
      {message}
    </p>
  );
}

function SectionHeading({
  number,
  title,
  optional = false,
}: {
  number: number;
  title: string;
  optional?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground shadow-soft">
        {number}
      </span>
      <p className="text-sm font-bold text-foreground">
        {title}
        {optional && <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>}
      </p>
    </div>
  );
}
