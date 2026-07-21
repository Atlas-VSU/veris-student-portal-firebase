import { Timestamp } from "firebase-admin/firestore";

export interface StudentData {
  studentId: string;
  program: string;
  name: string;
  programShortName?: string;
  programAcronym?: string;
}

export interface TermData {
  AY: string;
  semester: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  acronym: string;
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
  paymentState?: "unpaid" | "pending" | "rejected";
}

export interface FineItem {
  refId: string;
  title: string;
  amount: number;
  parentFineId: string;
  isPaid: boolean;
  isPending: boolean;
  date: any; // Timestamp or string
  academicYear?: string;
  semester?: string;
}

export interface Fine {
  id: string;
  description: string;
  amount: number;
  date?: string;
  reason: string;
  latestRejectionReason?: string;
  isPayable?: boolean;
  paymentState?: "unpaid" | "pending" | "rejected";
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
