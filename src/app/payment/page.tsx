"use client";

import { useMemo, useState } from "react";
import StudentVerificationPage from "@/features/payment/StudentVerificationPage";
import TermsSelectionPage from "@/features/payment/TermsSelectionPage";
import OrganizationSelectionPage from "@/features/payment/OrganizationSelectionPage";
import FinesFeesSelectionPage from "@/features/payment/FinesFeesSelectionPage";
import FinesPaymentFormPage from "@/features/payment/FinesPaymentFormPage";
import { StudentData, TermData, OrganizationData, FeeItem, FineItem, Fine, SelectedPaymentItems } from "@/features/payment/types";

type PaymentStep = "verification" | "term" | "organization" | "fees" | "payment";

interface OrganizationDueData extends OrganizationData {
  feeAmount: number;
  fineAmount: number;
  paymentSummary?: {
    pending: number;
    verified: number;
    rejected: number;
    unpaid: number;
  };
  fees: FeeItem[];
  fines: Fine[];
  fineItems: FineItem[];
}

export default function PaymentPage() {
  const [currentStep, setCurrentStep] = useState<PaymentStep>("verification");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermData | null>(null);
  
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [organizationDues, setOrganizationDues] = useState<OrganizationDueData[]>([]);
  const [isLoadingDues, setIsLoadingDues] = useState(false);
  const [duesError, setDuesError] = useState<string | null>(null);
  const [selectedPaymentItems, setSelectedPaymentItems] = useState<SelectedPaymentItems | null>(null);

  const selectedOrganization = useMemo(() => {
    return organizationDues.find((org) => org.id === selectedOrgId) || null;
  }, [organizationDues, selectedOrgId]);

  const getOrganizationStatusStates = (org: OrganizationDueData) => {
    const states = new Set<"unpaid" | "pending" | "rejected" | "verified">();

    for (const fee of org.fees) {
      states.add(fee.paymentState ?? "unpaid");
    }

    for (const fine of org.fines) {
      if (org.fineItems.length > 0) {
        states.add(fine.paymentState ?? "unpaid");
      }
    }

    const orderedStates: Array<"pending" | "verified" | "rejected" | "unpaid"> = [
      "pending",
      "verified",
      "rejected",
      "unpaid",
    ];

    return orderedStates.filter((state) => states.has(state));
  };

  const loadStudentDues = async (studentId: string, AY: string, semester: string) => {
    setIsLoadingDues(true);
    setDuesError(null);

    try {
      const response = await fetch(
        `/api/student-dues?studentId=${encodeURIComponent(studentId)}&AY=${encodeURIComponent(AY)}&semester=${encodeURIComponent(semester)}`
      );
      const result = await response.json();

      if (!response.ok || !result.success || !Array.isArray(result.organizations)) {
        throw new Error(result.error || "Failed to fetch outstanding dues.");
      }

      setOrganizationDues(
        result.organizations.map((org: OrganizationDueData) => ({
          id: org.id,
          name: org.name,
          acronym: org.acronym,
          outstandingAmount: Number(org.outstandingAmount ?? 0),
          paymentSummary: org.paymentSummary ?? { pending: 0, verified: 0, rejected: 0, unpaid: 0 },
          feeAmount: Number(org.feeAmount ?? 0),
          fineAmount: Number(org.fineAmount ?? 0),
          fees: Array.isArray(org.fees) ? org.fees : [],
          fines: Array.isArray(org.fines) ? org.fines : [],
          fineItems: Array.isArray(org.fineItems) ? org.fineItems : [],
          orgTreasurerName: org.orgTreasurerName,
          orgTreasurerUrl: org.orgTreasurerUrl,
          orgTreasurerNumber: org.orgTreasurerNumber,
          orgAuditorName: org.orgAuditorName,
          orgAuditorUrl: org.orgAuditorUrl,
          orgAuditorNumber: org.orgAuditorNumber,
        }))
      );
    } catch (error) {
      setOrganizationDues([]);
      setDuesError(
        error instanceof Error
          ? error.message
          : "Unable to load outstanding dues right now."
      );
    } finally {
      setIsLoadingDues(false);
    }
  };

  const handleStudentVerified = async (data: StudentData) => {
    setStudentData(data);
    setSelectedTerm(null);
    setSelectedOrgId(null);
    setSelectedPaymentItems(null);
    setCurrentStep("term");
  };

  const handleTermSelected = async (term: { AY: string; semester: string }) => {
    setSelectedTerm(term);
    setSelectedOrgId(null);
    setSelectedPaymentItems(null);
    
    if (studentData) {
      await loadStudentDues(studentData.studentId, term.AY, term.semester);
    }
    setCurrentStep("organization");
  };

  const handleBackToVerification = () => {
    setSelectedTerm(null);
    setSelectedOrgId(null);
    setSelectedPaymentItems(null);
    setCurrentStep("verification");
  };

  const handleBackToTerm = () => {
    setSelectedOrgId(null);
    setSelectedPaymentItems(null);
    setCurrentStep("term");
  };

  const handleOrganizationSelected = (organizationId: string) => {
    setSelectedOrgId(organizationId);
    setSelectedPaymentItems(null);
    setCurrentStep("fees");
  };

  const handleBackToOrganization = () => {
    setCurrentStep("organization");
  };

  const handleFeesSelected = (items: SelectedPaymentItems) => {
    setSelectedPaymentItems(items);
    setCurrentStep("payment");
  };

  const handleBackToFees = () => {
    setCurrentStep("fees");
  };

  return (
    <>
      {currentStep === "verification" && (
        <StudentVerificationPage onVerified={handleStudentVerified} currentStep={1} />
      )}
      
      {currentStep === "term" && studentData && (
        <TermsSelectionPage
          currentStep={2}
          studentData={studentData}
          onBack={handleBackToVerification}
          onNext={handleTermSelected}
        />
      )}

      {currentStep === "organization" && studentData && (
        <OrganizationSelectionPage
          studentData={studentData}
          selectedTerm={selectedTerm}
          organizations={organizationDues.map((org) => ({
            id: org.id,
            name: org.name,
            acronym: org.acronym,
            outstandingAmount: org.outstandingAmount,
            statusStates: getOrganizationStatusStates(org),
            paymentSummary: org.paymentSummary,
          }))}
          currentStep={3}
          isLoading={isLoadingDues}
          error={duesError}
          onBack={handleBackToTerm}
          onNext={handleOrganizationSelected}
        />
      )}
      {currentStep === "fees" && studentData && selectedOrganization && (
        <FinesFeesSelectionPage
          studentData={studentData}
          selectedTerm={selectedTerm}
          organizationData={selectedOrganization}
          currentStep={4}
          fees={selectedOrganization.fees}
          fines={selectedOrganization.fines}
          fineItems={selectedOrganization.fineItems}
          onBack={handleBackToOrganization}
          onNext={handleFeesSelected}
        />
      )}
      {currentStep === "payment" && studentData && selectedOrganization && selectedPaymentItems && (
        <FinesPaymentFormPage
          studentData={studentData}
          selectedTerm={selectedTerm}
          organizationData={selectedOrganization}
          selectedPaymentItems={selectedPaymentItems}
          currentStep={5}
          onBack={handleBackToFees}
          onRestart={handleBackToVerification}
        />
      )}
    </>
  );
}
