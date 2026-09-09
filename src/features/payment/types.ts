export interface StudentData {
  studentId: string;
  program: string;
  name: string;
  programShortName?: string;
  programAcronym?: string;
  /** Retired by the roster sync. They can still reach and settle dues from the
   *  terms they were enrolled in — the term step says which those are. */
  isArchived?: boolean;
}

export interface TermData {
  AY: string;
  semester: string;
  /** Only the active term accepts new payments. Past terms are opened read-only
   *  so a student can still look at what they paid and what was cleared. */
  isActive?: boolean;
}

export interface OrganizationData {
  id: string;
  name: string;
  acronym: string;
  /** Uploaded by the org in the admin app. Null when they have not set one. */
  orgLogoUrl?: string | null;
  outstandingAmount: number;
  statusStates?: Array<"unpaid" | "pending" | "rejected" | "verified">;
  paymentSummary?: {
    pending: number;
    verified: number;
    rejected: number;
    unpaid: number;
  };

  orgTreasurerName?: string;
  orgTreasurerUrl?: string;
  orgTreasurerNumber?: string;
  orgAuditorName?: string;
  orgAuditorUrl?: string;
  orgAuditorNumber?: string;
}

/** The states the dues API reports. "verified" was missing here even though the
 *  API has always returned it, so any narrowing on this union was unsound. */
export type PaymentState = "unpaid" | "pending" | "rejected" | "verified";

export interface FeeItem {
  id: string;
  description: string;
  title: string;
  amount: number;
  dueDate?: string;
  latestRejectionReason?: string;
  isPayable?: boolean;
  academicYear?: string;
  semester?: string;
  paymentState?: PaymentState;
}

export interface FineItem {
  refId: string;
  title: string;
  amount: number;
  parentFineId: string;
  isPaid: boolean;
  isPending: boolean;
  isWaived?: boolean;
  date: any; // Timestamp or string
  academicYear?: string;
  semester?: string;
  /** Derived per item from its own flags — never inherited from the parent fine. */
  paymentState?: PaymentState;
  isPayable?: boolean;
  /** Present only when THIS item was part of the declined submission. */
  latestRejectionReason?: string;
}

export interface Fine {
  id: string;
  description: string;
  amount: number;
  date?: string;
  reason: string;
  latestRejectionReason?: string;
  isPayable?: boolean;
  paymentState?: PaymentState;
}

export interface SelectedPaymentItems {
  fees: FeeItem[];
  fines: Fine[];
  fineItems: FineItem[];
  feeAmount: number;
  fineAmount: number;
  totalAmount: number;
}

export type OnlinePaymentMethod = "gcash";
