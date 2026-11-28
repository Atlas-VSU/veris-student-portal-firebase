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
  /** False when the organization has temporarily paused online payments. */
  isAcceptingPayments?: boolean;
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

  // Bank transfer details — populated by admin; absence means bank option is unavailable
  orgBankName?: string;
  orgBankAccountNumber?: string;
  orgBankAccountName?: string;
  orgBankQrUrl?: string;
}

/** The states the dues API reports. "verified" was missing here even though the
 *  API has always returned it, so any narrowing on this union was unsound. */
export type PaymentState = "unpaid" | "pending" | "rejected" | "verified";

export interface StudentReceiptItem {
  name: string;
  type: "fees" | "fines";
  amount: number;
}

export interface StudentReceiptData {
  receiptId: string;
  studentName: string;
  studentId: string;
  orgName: string;
  orgAcronym: string;
  orgLogoUrl?: string | null;
  items: StudentReceiptItem[];
  total: number;
  date: string;
  verifiedByName: string;
  paymentMethod: string;
  AY: string;
  semester: string;
}

export interface FeeItem {
  id: string;
  description: string;
  title: string;
  amount: number;
  paidAmount?: number;
  dueDate?: string;
  latestRejectionReason?: string;
  isPayable?: boolean;
  academicYear?: string;
  semester?: string;
  paymentState?: PaymentState;
  /** Official or reconstructed receipt when the fee payment has been verified. */
  receipt?: StudentReceiptData;
}

export interface FineItem {
  refId: string;
  title: string;
  amount: number;
  parentFineId: string;
  isPaid: boolean;
  isPending: boolean;
  isWaived?: boolean;
  isArchived?: boolean;
  date: any; // Timestamp or string
  academicYear?: string;
  semester?: string;
  /** Derived per item from its own flags — never inherited from the parent fine. */
  paymentState?: PaymentState;
  isPayable?: boolean;
  /** Present only when THIS item was part of the declined submission. */
  latestRejectionReason?: string;
  /** Official or reconstructed receipt when the fine item has been paid (not waived). */
  receipt?: StudentReceiptData;
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

export type OnlinePaymentMethod = "gcash" | "bank_transfer";
