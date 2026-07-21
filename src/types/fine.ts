import { Timestamp } from "firebase-admin/firestore";

export type FineItem = {
  id: string;
  itemNumber: number;
  fineTypeName: string;
  eventId: string;
  eventName: string;
  eventDate: Timestamp;
  amount: number;
  reason: string | null;
  issuedBy: string;
  issuedAt: Timestamp;
  isWaived: boolean;
  waivedBy?: string;
  waivedAt?: Timestamp;
  waivedReason?: string;
  isPaid: boolean;
  isPending?: boolean;
  academicYear?: string;
  semester?: string;
};
