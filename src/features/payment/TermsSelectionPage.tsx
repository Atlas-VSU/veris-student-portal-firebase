"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, CalendarDays, ChevronRight, Loader2, UserCircle } from "lucide-react";
import { PaymentBrandHeader } from "./components/PaymentBrandHeader";
import { PaymentProgressBar } from "./components/PaymentProgressBar";
import { StudentData } from "./types";

interface Term {
  id: string;
  AY: string;
  semester: string;
  displayName: string;
  isActive?: boolean;
  /** Whether this student holds any record for the term. Absent when the API
   *  was called without a studentId. */
  hasRecords?: boolean;
}

interface TermsSelectionPageProps {
  studentData: StudentData;
  currentStep: 1 | 2 | 3 | 4 | 5;
  onBack: () => void;
  /** May be async — the parent loads the student's dues before advancing, so
   *  the button has to stay responsive for the length of that fetch. */
  onNext: (selectedTerm: { AY: string; semester: string }) => void | Promise<void>;
}

export default function TermsSelectionPage({
  studentData,
  currentStep,
  onBack,
  onNext,
}: TermsSelectionPageProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        // Scoped to the student so each term can say whether they were
        // actually enrolled in it.
        const res = await fetch(
          `/api/terms?studentId=${encodeURIComponent(studentData.studentId)}`
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load terms.");
        }

        setTerms(data.terms || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load terms.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTerms();
  }, [studentData.studentId]);

  // A retired student is no longer enrolled anywhere, so what they can still
  // reach is their own history: viewable, not payable.
  const isViewOnly = studentData.isArchived === true;

  /**
   * Whether the student was enrolled in a term.
   *
   * PAST terms have no direct marker, so they are inferred from the trace the
   * student left (clearance, dues, a payment). The CURRENT term does have one:
   * `isDeleted` is a statement about now. Inferring it from records too was
   * wrong — leftover unarchived records made a retired student look enrolled,
   * which is exactly what happens when the roster sync ran `additiveOnly`, when
   * its archiving covered only part of the record set, or when someone set
   * `isDeleted` by hand. The direct signal settles the current term.
   */
  const isEnrolled = (term: Term) => {
    if (term.isActive && isViewOnly) return false;
    return term.hasRecords !== false;
  };

  const isSelectable = isEnrolled;

  const openableTerms = terms.filter(isSelectable);
  const notEnrolledInCurrentTerm = terms.some(
    (term) => term.isActive && !isEnrolled(term)
  );

  const handleContinue = async () => {
    const selected = terms.find((t) => t.id === selectedTermId);
    if (!selected || !isSelectable(selected) || isAdvancing) return;

    // The parent fetches the student's dues before it swaps the step, so
    // without this the button simply stops responding for the whole request.
    setIsAdvancing(true);
    try {
      await onNext({ AY: selected.AY, semester: selected.semester });
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 relative overflow-hidden font-sans">
      {/* Background Organic Blurred Blobs */}
      <div className="absolute top-1/4 -left-32 w-[25rem] h-[25rem] bg-primary/10 rounded-full blur-3xl pointer-events-none blob-shape-1 animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-[25rem] h-[25rem] bg-secondary/10 rounded-full blur-3xl pointer-events-none blob-shape-2 animate-float-delayed" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <PaymentBrandHeader />
        
        <PaymentProgressBar
          currentStep={currentStep}
          subtitle="Select the academic term you want to pay for"
        />

        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="min-[400px]:hidden">Back</span>
          <span className="hidden min-[400px]:inline">Back to Student Verification</span>
        </Button>

        {/* Student Info Banner Card */}
        <Card className="border-border bg-primary/5 shadow-soft">
          <CardContent className="px-6 py-4">
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
          </CardContent>
        </Card>

        {/* Term Selection Card */}
        <Card className="bg-card border border-border/50 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold font-serif">Select Academic Term</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Choose the term to view and settle your outstanding dues
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-4">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading available terms...
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            ) : terms.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No payment terms available at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notEnrolledInCurrentTerm && (
                  <div className="rounded-[1.25rem] border border-amber-300 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-bold text-amber-800">
                      You are not enrolled for the current term
                    </p>
                    <p className="text-xs text-amber-700 font-medium mt-0.5">
                      {openableTerms.length > 0
                        ? "Your earlier terms are listed below. They are view only — you can review your records and payments, but no new payment can be made against them."
                        : "We could not find any records for you in the terms listed. Please contact your organization."}
                    </p>
                  </div>
                )}

                {terms.map((term) => {
                  const selectable = isSelectable(term);

                  return (
                  <button
                    key={term.id}
                    onClick={() => selectable && setSelectedTermId(term.id)}
                    disabled={!selectable}
                    aria-disabled={!selectable}
                    className={`w-full text-left p-4 rounded-[1.5rem] border-2 transition-all duration-300 flex items-center justify-between gap-4 outline-none ${
                      !selectable
                        ? "border-border bg-muted/30 opacity-70 cursor-not-allowed"
                        : selectedTermId === term.id
                          ? "border-primary bg-primary/5 shadow-soft cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                          : "border-border bg-white/50 cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shrink-0 ${selectable ? "bg-primary/10" : "bg-muted"}`}>
                        <CalendarDays className={`h-5 w-5 ${selectable ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-col min-[450px]:flex-row min-[450px]:items-center gap-1 sm:gap-2">
                          <p className="font-bold text-base text-foreground">
                            {term.displayName}
                          </p>
                          {term.isActive && (
                            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                              Current Term
                            </span>
                          )}
                        </div>
                        {!selectable ? (
                          <p className="text-xs font-medium text-amber-700">
                            {term.isActive
                              ? "You are not enrolled for this term"
                              : "No records for this term"}
                          </p>
                        ) : isViewOnly ? (
                          <p className="text-xs font-medium text-muted-foreground">
                            View only — records and payment history
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {selectable && (
                      <ChevronRight
                        className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                          selectedTermId === term.id ? "text-primary translate-x-0.5" : "text-muted-foreground"
                        }`}
                      />
                    )}
                  </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedTermId || isLoading || isAdvancing}
            className="w-full min-[400px]:w-auto gap-2"
          >
            {isAdvancing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your records…
              </>
            ) : (
              <>
                {isViewOnly ? "View Records" : "View Organizations"}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
