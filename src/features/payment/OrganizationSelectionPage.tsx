"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowLeft, BookOpen, Building2, ChevronRight, Loader2, UserCircle } from "lucide-react";
import { PaymentBrandHeader } from "./components/PaymentBrandHeader";
import { PaymentProgressBar } from "./components/PaymentProgressBar";
import { Separator } from "@/components/ui/separator";
import { StudentData, TermData, OrganizationData } from "./types";

interface OrganizationSelectionPageProps {
  studentData: StudentData;
  organizations: OrganizationData[];
  selectedTerm?: TermData | null;
  currentStep: 1 | 2 | 3 | 4 | 5;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
  onNext: (organizationId: string) => void;
}

const getStatusBadge = (status: "unpaid" | "pending" | "rejected" | "verified" | "cleared") => {
  switch (status) {
    case "pending":
      return {
        label: "Pending Review",
        className: "border-secondary/20 bg-secondary/10 text-secondary",
      };
    case "verified":
      return {
        label: "Approved",
        className: "border-primary/20 bg-primary/10 text-primary",
      };
    case "rejected":
      return {
        label: "Declined",
        className: "border-destructive/20 bg-destructive/10 text-destructive",
      };
    case "unpaid":
      return {
        label: "Unpaid",
        className: "border-secondary/20 bg-secondary/10 text-secondary",
      };
    case "cleared":
      return {
        label: "Cleared",
        className: "border-muted bg-muted text-muted-foreground",
      };
    default:
      return {
        label: "Unpaid",
        className: "border-secondary/20 bg-secondary/10 text-secondary",
      };
  }
};

export default function OrganizationSelectionPage({
  studentData,
  organizations,
  currentStep,
  isLoading = false,
  error = null,
  onBack,
  onNext,
  selectedTerm,
}: OrganizationSelectionPageProps) {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const isOrganizationPayable = (organization: OrganizationData) => {
    const summary = organization.paymentSummary;
    if (summary) {
      return summary.unpaid > 0 || summary.rejected > 0;
    }

    const states = organization.statusStates ?? [];
    return states.includes("unpaid") || states.includes("rejected");
  };

  const hasPayableOrganizations = organizations.some((organization) => isOrganizationPayable(organization));

  const handleOrgSelect = (orgId: string) => {
    const org = organizations.find((organization) => organization.id === orgId);
    if (!org || !isOrganizationPayable(org)) {
      return;
    }

    setSelectedOrg(orgId);
  };

  const handleContinue = () => {
    if (!hasPayableOrganizations) {
      onBack();
      return;
    }

    if (selectedOrg) {
      onNext(selectedOrg);
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
          subtitle="Choose the organization you want to settle dues with"
        />
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          size="sm"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="min-[400px]:hidden">Back</span>
          <span className="hidden min-[400px]:inline">Back to Terms Selection</span>
        </Button>

        {/* Term & Student Info Banner Card */}
        <Card className="border-border bg-primary/5 shadow-soft">
          <CardContent className="px-6 py-4 space-y-4">
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

            {/* Student Row */}
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

        {/* Organization Selection Card */}
        <Card className="bg-card border border-border/50 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold font-serif">Select Organization</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Choose the organization you want to pay fees or fines for
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-4">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading organizations...
              </div>
            ) : organizations.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No organization payment records found for this student.</p>
                {error && <p className="text-xs text-destructive font-medium mt-2">{error}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                {organizations.map((org) => (
                  (() => {
                    const isPayable = isOrganizationPayable(org);

                    return (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSelect(org.id)}
                        disabled={!isPayable}
                        className={`w-full text-left p-4 rounded-[1.5rem] border-2 transition-all duration-300 flex items-start justify-between gap-4 outline-none cursor-pointer ${
                          isPayable
                            ? "hover:border-primary/50 hover:bg-primary/5"
                            : "opacity-70 cursor-not-allowed"
                        } ${
                          selectedOrg === org.id && isPayable
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border bg-white/50"
                        }`}
                      >
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="p-3 rounded-xl bg-primary/10 mt-1 shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-base text-foreground leading-tight">
                                {org.name}
                              </h3>
                              <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 rounded-full font-bold uppercase">
                                {org.acronym}
                              </Badge>
                              {(() => {
                                const summaryStates: Array<"unpaid" | "pending" | "rejected" | "verified" | "cleared"> = org.statusStates && org.statusStates.length > 0
                                  ? org.statusStates
                                  : org.outstandingAmount > 0 || (org.paymentSummary?.unpaid ?? 0) > 0
                                    ? ["unpaid"]
                                    : isPayable
                                      ? []
                                      : ["cleared"];

                                return summaryStates.map((status) => {
                                  const badge = getStatusBadge(status);

                                  return (
                                    <Badge
                                      key={status}
                                      variant="outline"
                                      className={`text-[10px] sm:text-xs shrink-0 rounded-full font-bold uppercase ${badge.className}`}
                                    >
                                      {badge.label}
                                    </Badge>
                                  );
                                });
                              })()}
                            </div>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                Outstanding Balance:
                              </span>
                              <span
                                className={`text-base font-bold ${
                                  org.outstandingAmount > 0
                                    ? "text-destructive"
                                    : "text-primary"
                                }`}
                              >
                                ₱{org.outstandingAmount.toFixed(2)}
                              </span>
                            </div>
                            {org.paymentSummary && (org.paymentSummary.pending > 0 || org.paymentSummary.verified > 0 || org.paymentSummary.rejected > 0) && (
                              <p className="mt-2 text-xs text-muted-foreground font-medium">
                                {org.paymentSummary.pending > 0 && `${org.paymentSummary.pending} pending`}
                                {org.paymentSummary.pending > 0 && org.paymentSummary.verified > 0 ? " · " : ""}
                                {org.paymentSummary.verified > 0 && `${org.paymentSummary.verified} verified`}
                                {(org.paymentSummary.pending > 0 || org.paymentSummary.verified > 0) && org.paymentSummary.rejected > 0 ? " · " : ""}
                                {org.paymentSummary.rejected > 0 && `${org.paymentSummary.rejected} rejected`}
                              </p>
                            )}
                            {!isPayable && (
                              <p className="mt-2 text-xs text-muted-foreground font-medium">
                                No payment needed for now. Current submissions are pending or already verified.
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={`mt-2 hidden h-5 w-5 shrink-0 min-[400px]:block transition-transform duration-300 ${
                            selectedOrg === org.id && isPayable ? "text-primary translate-x-0.5" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    );
                  })()
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={isLoading || organizations.length === 0 || (hasPayableOrganizations && !selectedOrg)}
            className="w-full min-[400px]:w-auto gap-2"
          >
            {hasPayableOrganizations ? "Continue to Payment Selection" : "Exit"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
