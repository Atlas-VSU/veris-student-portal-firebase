import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin.config";
import { FineItem } from "@/types/fine";
import {
  attachOrganizationReceipts,
  FeeDueInternal,
  FineDueInternal,
  FineItemDueInternal,
  getLatestVerifiedPaymentLog,
  loadStudentReceiptContext,
  PaymentLogForReceipt,
  toIsoDate,
  toMillis, 
} from "./receipt-resolver";

type FeeRecord = {
  id: string;
  orgId?: string;
  title?: string;
  feeType?: string;
  balance?: number;
  amount?: number;
  paidAmount?: number;
  dueDate?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  isArchived?: boolean;
  academicYear?: string;
  semester?: string;
  status?: string;
};

type FineRecord = {
  id: string;
  orgId?: string;
  fineItemsCount?: number;
  reason?: string | null;
  balance?: number;
  accumulatedAmount?: number;
  dueDate?: { toDate?: () => Date } | Date | string | null;
  lastFineIssuedAt?: { toDate?: () => Date } | Date | string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  status?: string;
  isArchived?: boolean;
  metadata?: {
    isArchived?: boolean;
    updatedAt?: unknown;
    createdAt?: unknown;
  };
};

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
};

const getLatestRejectedReason = (logs: PaymentLogForReceipt[]): string | undefined => {
  const rejectedLogs = logs
    .filter((log) => log.status === "rejected" && typeof log.rejectionReason === "string")
    .map((log) => ({
      reason: (log.rejectionReason ?? "").trim(),
      updatedAt: Math.max(
        toMillis(log.verifiedAt),
        toMillis(log.metaData?.updatedAt),
        toMillis(log.createdAt)
      ),
    }))
    .filter((entry) => entry.reason.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return rejectedLogs[0]?.reason;
};

const SETTLED_RECORD_STATUSES = new Set(["paid", "waived"]);

const normalizePaymentState = (
  status: unknown
): "unpaid" | "pending" | "rejected" | "verified" => {
  if (status === "pending") return "pending";
  if (status === "verified" || status === "approved") return "verified";
  if (SETTLED_RECORD_STATUSES.has(String(status))) return "verified";
  if (status === "rejected") return "rejected";
  return "unpaid";
};

const outstandingOf = (balance: unknown, fallbackAmount: unknown): number => {
  if (typeof balance === "number" && Number.isFinite(balance)) {
    return Math.max(0, balance);
  }
  return Math.max(0, asNumber(fallbackAmount));
};

const getRejectedRefIds = async (logs: PaymentLogForReceipt[]): Promise<Set<string>> => {
  const latestRejected = logs
    .filter((log) => log.status === "rejected" && typeof log.paymentProofId === "string")
    .sort(
      (a, b) =>
        Math.max(toMillis(b.verifiedAt), toMillis(b.metaData?.updatedAt), toMillis(b.createdAt)) -
        Math.max(toMillis(a.verifiedAt), toMillis(a.metaData?.updatedAt), toMillis(a.createdAt))
    )[0];

  if (!latestRejected?.paymentProofId) return new Set();

  try {
    const proof = await adminDb
      .collection("proofOfPayments")
      .doc(latestRejected.paymentProofId)
      .get();

    const items = (proof.data()?.metadata?.items ?? []) as Array<{
      refId?: string;
      paymentType?: string;
    }>;

    return new Set(
      items
        .filter((item) => item.paymentType === "fines" && typeof item.refId === "string")
        .map((item) => item.refId as string)
    );
  } catch {
    return new Set();
  }
};

const getLatestPaymentHistoryState = (
  logs: PaymentLogForReceipt[]
): "pending" | "verified" | "rejected" | undefined => {
  const latest = logs
    .map((log) => ({
      status: log.status === "approved" ? "verified" : log.status,
      updatedAt: Math.max(
        toMillis(log.verifiedAt),
        toMillis(log.metaData?.updatedAt),
        toMillis(log.createdAt)
      ),
    }))
    .filter(
      (entry): entry is { status: "pending" | "verified" | "rejected"; updatedAt: number } =>
        entry.status === "pending" || entry.status === "verified" || entry.status === "rejected"
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  return latest?.status;
};

const buildOrgDisplay = (orgId: string, data: Record<string, unknown> | undefined) => {
  const acronym =
    String(data?.acronym ?? "").trim() ||
    String(data?.shortName ?? "").trim() ||
    String(data?.code ?? "").trim() ||
    "ORG";

  const fullName =
    String(data?.organizationName ?? "").trim() ||
    String(data?.name ?? "").trim() ||
    `${String(data?.firstName ?? "").trim()} ${String(data?.lastName ?? "").trim()}`.trim() ||
    String(data?.email ?? "").trim() ||
    orgId;

  return { acronym, name: fullName };
};

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId")?.trim();
    const AY = request.nextUrl.searchParams.get("AY")?.trim();
    const semester = request.nextUrl.searchParams.get("semester")?.trim();

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID is required.",
        },
        { status: 400 }
      );
    }

    let feesQuery: FirebaseFirestore.Query = adminDb.collection("fees").where("studentId", "==", studentId);
    let finesQuery: FirebaseFirestore.Query = adminDb.collection("fines").where("studentId", "==", studentId);

    if (AY && semester) {
      feesQuery = feesQuery
        .where("academicYear", "==", AY)
        .where("semester", "==", semester);
    }

    const [feesSnapshot, finesSnapshot, receiptContext] = await Promise.all([
      feesQuery.get(),
      finesQuery.get(),
      loadStudentReceiptContext(studentId),
    ]);

    const { resolvedStudentName, verifiedProofsById, ensureProofLoaded } = receiptContext;

    const grouped = new Map<
      string,
      {
        orgId: string;
        feeAmount: number;
        fineAmount: number;
        paymentSummary: {
          pending: number;
          verified: number;
          rejected: number;
          unpaid: number;
        };
        fees: FeeDueInternal[];
        fines: FineDueInternal[];
        fineItems: FineItemDueInternal[];
      }
    >();

    // Process Fees
    for (const doc of feesSnapshot.docs) {
      const fee = { id: doc.id, ...doc.data() } as FeeRecord;
      if (!fee.orgId) continue;
      if (fee.isArchived) continue;

      const feePaymentHistorySnapshot = await adminDb
        .collection("fees")
        .doc(fee.id)
        .collection("paymentHistory")
        .get();
      const feePaymentLogs = feePaymentHistorySnapshot.docs.map(
        (paymentDoc) => ({ id: paymentDoc.id, ...paymentDoc.data() } as PaymentLogForReceipt)
      );

      const latestRejectionReason = getLatestRejectedReason(feePaymentLogs);
      const latestHistoryState = getLatestPaymentHistoryState(feePaymentLogs);
      const latestVerifiedLog = getLatestVerifiedPaymentLog(feePaymentLogs);

      await Promise.all(
        feePaymentLogs
          .filter((log) => log.status === "verified" || log.status === "approved")
          .map((log) => ensureProofLoaded(log.paymentProofId))
      );

      const outstanding = outstandingOf(fee.balance, fee.amount);
      const settledAmount =
        asNumber(fee.paidAmount) > 0
          ? asNumber(fee.paidAmount)
          : asNumber(fee.amount) > 0
            ? asNumber(fee.amount)
            : asNumber(latestVerifiedLog?.amount);

      const isSettled =
        SETTLED_RECORD_STATUSES.has(String(fee.status)) || outstanding <= 0;
      const hasPendingSubmission = latestHistoryState === "pending";

      const paymentState: "unpaid" | "pending" | "rejected" | "verified" =
        hasPendingSubmission
          ? "pending"
          : isSettled
            ? "verified"
            : latestHistoryState === "rejected"
              ? "rejected"
              : "unpaid";

      const isPayable = !isSettled && !hasPendingSubmission;
      const existing = grouped.get(fee.orgId) ?? {
        orgId: fee.orgId,
        feeAmount: 0,
        fineAmount: 0,
        paymentSummary: { pending: 0, verified: 0, rejected: 0, unpaid: 0 },
        fees: [],
        fines: [],
        fineItems: [],
      };

      if (paymentState === "pending") existing.paymentSummary.pending += 1;
      else if (paymentState === "verified") existing.paymentSummary.verified += 1;
      else if (paymentState === "rejected") existing.paymentSummary.rejected += 1;
      else existing.paymentSummary.unpaid += 1;

      if (isPayable) {
        existing.feeAmount += outstanding > 0 ? outstanding : 0;
      }
      existing.fees.push({
        id: fee.id,
        description: fee.title || fee.feeType || "Outstanding Fee",
        amount: outstanding,
        paidAmount: settledAmount,
        dueDate: toIsoDate(fee.dueDate),
        latestRejectionReason,
        isPayable,
        academicYear: fee.academicYear || AY || "",
        semester: fee.semester || semester || "",
        paymentState,
        isWaived: String(fee.status) === "waived",
        latestVerifiedLog,
        fallbackDate: toIsoDate(fee.updatedAt) || toIsoDate(fee.createdAt) || toIsoDate(fee.dueDate),
      });

      grouped.set(fee.orgId, existing);
    }

    // Process Fines
    for (const doc of finesSnapshot.docs) {
      const fine = { id: doc.id, ...doc.data() } as FineRecord;
      if (!fine.orgId) continue;
      if (fine.isArchived || fine.metadata?.isArchived) continue;

      let fineItemsQuery: FirebaseFirestore.Query = adminDb
        .collection("fines")
        .doc(fine.id)
        .collection("fineItems");

      if (AY && semester) {
        fineItemsQuery = fineItemsQuery
          .where("academicYear", "==", AY)
          .where("semester", "==", semester);
      }

      const [finePaymentHistorySnapshot, fineItemsSnapshot] = await Promise.all([
        adminDb.collection("fines").doc(fine.id).collection("paymentHistory").get(),
        fineItemsQuery.get(),
      ]);

      const finePaymentLogs = finePaymentHistorySnapshot.docs.map(
        (paymentDoc) => ({ id: paymentDoc.id, ...paymentDoc.data() } as PaymentLogForReceipt)
      );

      const latestRejectionReason = getLatestRejectedReason(finePaymentLogs);
      const latestVerifiedFineLog = getLatestVerifiedPaymentLog(finePaymentLogs);
      await Promise.all(
        finePaymentLogs
          .filter((log) => log.status === "verified" || log.status === "approved")
          .map((log) => ensureProofLoaded(log.paymentProofId))
      );
      const rejectedRefIds = latestRejectionReason
        ? await getRejectedRefIds(finePaymentLogs)
        : new Set<string>();

      const items: FineItemDueInternal[] = [];
      for (const itemDoc of fineItemsSnapshot.docs) {
        const fineItem = { id: itemDoc.id, ...itemDoc.data() } as FineItem;
        if (fineItem.isArchived === true || fineItem.metadata?.isArchived === true) {
          continue;
        }

        const settled = fineItem.isPaid === true || fineItem.isWaived === true;
        const pending = !settled && fineItem.isPending === true;
        const rejected = !settled && !pending && rejectedRefIds.has(fineItem.id);

        const itemState: "unpaid" | "pending" | "rejected" | "verified" = settled
          ? "verified"
          : pending
            ? "pending"
            : rejected
              ? "rejected"
              : "unpaid";

        items.push({
          refId: fineItem.id,
          title: fineItem.eventName,
          amount: asNumber(fineItem.amount),
          parentFineId: fine.id,
          isPaid: settled,
          isPending: pending,
          isWaived: fineItem.isWaived === true,
          date: fineItem.eventDate,
          academicYear: fineItem.academicYear || AY || undefined,
          semester: fineItem.semester || semester || undefined,
          paymentState: itemState,
          isPayable: itemState === "unpaid" || itemState === "rejected",
          latestRejectionReason: rejected ? latestRejectionReason : undefined,
        });
      }

      const outstanding = items
        .filter((item) => item.isPayable)
        .reduce((sum, item) => sum + item.amount, 0);

      const payableItems = items.filter((item) => item.isPayable);
      const paymentState: "unpaid" | "pending" | "rejected" | "verified" =
        items.length === 0
          ? normalizePaymentState(fine.status)
          : items.some((item) => item.paymentState === "pending")
            ? "pending"
            : payableItems.length === 0
              ? "verified"
              : payableItems.some((item) => item.paymentState === "rejected")
                ? "rejected"
                : "unpaid";

      const isPayable = payableItems.length > 0;

      if (items.length === 0) continue;

      const existing = grouped.get(fine.orgId) ?? {
        orgId: fine.orgId,
        feeAmount: 0,
        fineAmount: 0,
        paymentSummary: { pending: 0, verified: 0, rejected: 0, unpaid: 0 },
        fees: [],
        fines: [],
        fineItems: [],
      };

      if (paymentState === "pending") existing.paymentSummary.pending += 1;
      else if (paymentState === "verified") existing.paymentSummary.verified += 1;
      else if (paymentState === "rejected") existing.paymentSummary.rejected += 1;
      else if (paymentState === "unpaid") existing.paymentSummary.unpaid += 1;

      if (isPayable) {
        existing.fineAmount += outstanding > 0 ? outstanding : 0;
      }
      existing.fines.push({
        id: fine.id,
        description: fine.reason || "Outstanding Fine",
        amount: outstanding,
        date:
          toIsoDate(fine.dueDate) ||
          toIsoDate(fine.lastFineIssuedAt) ||
          toIsoDate(fine.metadata?.updatedAt) ||
          toIsoDate(fine.updatedAt),
        reason: fine.reason || "Fine/penalty charge",
        latestRejectionReason,
        isPayable,
        paymentState,
        latestVerifiedLog: latestVerifiedFineLog,
      });

      items.forEach((item) => {
        existing.fineItems.push(item);
      });

      grouped.set(fine.orgId, existing);
    }

    const orgIds = Array.from(grouped.keys());
    const orgDocs = await Promise.all(
      orgIds.map((orgId) => adminDb.collection("organizations").doc(orgId).get())
    );
    const organizations = orgIds
      .map((orgId, index) => {
        const due = grouped.get(orgId);
        if (!due) return null;

        const orgData = orgDocs[index].exists
          ? (orgDocs[index].data() as Record<string, unknown>)
          : undefined;
        const display = buildOrgDisplay(orgId, orgData);
        const orgName = orgData?.name ? String(orgData.name) : display.name;
        const orgAcronym = display.acronym;
        const orgLogoUrl = orgData?.orgLogoUrl ? String(orgData.orgLogoUrl) : null;

        const { fees, fines, fineItems } = attachOrganizationReceipts({
          orgId,
          orgName,
          orgAcronym,
          orgLogoUrl,
          studentId,
          resolvedStudentName,
          defaultAY: AY,
          defaultSemester: semester,
          verifiedProofsById,
          fees: due.fees,
          fines: due.fines,
          fineItems: due.fineItems,
        });

        return {
          id: orgId,
          name: orgName,
          acronym: orgAcronym,
          orgLogoUrl,
          isAcceptingPayments: orgData?.isAcceptingPayments !== false,
          outstandingAmount: due.feeAmount + due.fineAmount,
          feeAmount: due.feeAmount,
          fineAmount: due.fineAmount,
          paymentSummary: due.paymentSummary,
          fees,
          fines,
          fineItems,
          orgTreasurerName: orgData?.orgTreasurerName || null,
          orgTreasurerUrl: orgData?.orgTreasurerUrl || null,
          orgTreasurerNumber: orgData?.orgTreasurerNumber || null,
          orgAuditorName: orgData?.orgAuditorName || null,
          orgAuditorUrl: orgData?.orgAuditorUrl || null,
          orgAuditorNumber: orgData?.orgAuditorNumber || null,
          orgBankName: orgData?.orgBankName || null,
          orgBankAccountNumber: orgData?.orgBankAccountNumber || null,
          orgBankAccountName: orgData?.orgBankAccountName || null,
          orgBankQrUrl: orgData?.orgBankQrUrl || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error("Error fetching student dues:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch student dues.",
      },
      { status: 500 }
    );
  }
}
