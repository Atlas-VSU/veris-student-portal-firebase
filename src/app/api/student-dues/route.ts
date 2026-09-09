import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin.config";
import { Timestamp } from "firebase-admin/firestore";
import { FineItem } from "@/types/fine";

type FeeRecord = {
  id: string;
  orgId?: string;
  title?: string;
  feeType?: string;
  balance?: number;
  amount?: number;
  dueDate?: unknown;
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
  status?: string;
  metadata?: {
    isArchived?: boolean;
  };
};

type PaymentLogRecord = {
  status?: string;
  rejectionReason?: string | null;
  paymentProofId?: string;
  createdAt?: unknown;
  verifiedAt?: unknown;
  metaData?: {
    updatedAt?: unknown;
  };
};

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
};

const toIsoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (typeof value === "object" && value && "toDate" in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    const date = maybeTimestamp.toDate?.();
    if (date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds?: unknown })._seconds === "number"
  ) {
    const seconds = (value as { _seconds: number })._seconds;
    return new Date(seconds * 1000).toISOString();
  }

  return undefined;
};

const toMillis = (value: unknown): number => {
  if (!value) return 0;

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  if (typeof value === "object" && value && "toDate" in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    const date = maybeTimestamp.toDate?.();
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds?: unknown })._seconds === "number"
  ) {
    return (value as { _seconds: number })._seconds * 1000;
  }

  return 0;
};

const getLatestRejectedReason = (logs: PaymentLogRecord[]): string | undefined => {
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

/**
 * The status vocabulary the admin apps actually write. Verified against
 * coral-ussc, veris-system-firebase and veris-v1-super-admin, which all agree:
 *
 *   fees.status            "unpaid" | "pending" | "partial" | "paid"
 *   fines.status           "unpaid" | "pending" | "partial" | "paid" | "waived"
 *   paymentHistory.status  "pending" | "verified" | "rejected"
 *
 * This previously mapped only the paymentHistory words and dropped everything
 * else to "unpaid", so a record the admin had marked "paid" or "waived" read
 * back as still owing.
 */
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

/**
 * What the student still owes on a record.
 *
 * `balance` is authoritative once it exists — the admin decrements it on every
 * verified payment. Falling back to `amount` whenever balance was merely zero
 * (rather than absent) reported a fully paid record as owing its full amount
 * again, so the fallback now only fires when the field is genuinely missing.
 */
const outstandingOf = (
  balance: unknown,
  fallbackAmount: unknown
): number => {
  if (typeof balance === "number" && Number.isFinite(balance)) {
    return Math.max(0, balance);
  }
  return Math.max(0, asNumber(fallbackAmount));
};

/**
 * The refIds covered by the most recent rejected submission.
 *
 * A rejection is a property of one submission, not of the parent fine: the
 * admin clears `isPending` on exactly the items it covered and leaves the rest
 * untouched. The paymentHistory log does not record which items it carried,
 * but it does carry `paymentProofId`, and the proof stores `metadata.items` —
 * so one extra read per rejected fine recovers the attribution. Without it,
 * every unpaid item under the fine inherits the rejection, including items
 * raised after it that were never submitted.
 */
const getRejectedRefIds = async (logs: PaymentLogRecord[]): Promise<Set<string>> => {
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
    // A missing or unreadable proof must not fail the dues listing — it only
    // costs per-item rejection attribution, which the group-level reason covers.
    return new Set();
  }
};

const getLatestPaymentHistoryState = (
  logs: PaymentLogRecord[]
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

    const [feesSnapshot, finesSnapshot] = await Promise.all([
      feesQuery.get(),
      finesQuery.get(),
    ]);

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
        fees: Array<{
          id: string;
          description: string;
          amount: number;
          dueDate?: string;
          latestRejectionReason?: string;
          isPayable: boolean;
          academicYear: string;
          semester: string;
          paymentState: "unpaid" | "pending" | "rejected" | "verified";
        }>;
        fines: Array<{
          id: string;
          description: string;
          amount: number;
          date?: string;
          reason: string;
          latestRejectionReason?: string;
          isPayable: boolean;
          paymentState: "unpaid" | "pending" | "rejected" | "verified";
        }>;
        fineItems: Array<{
          refId: string;
          title: string;
          amount: number;
          parentFineId: string;
          isPaid: boolean;
          isPending: boolean;
          isWaived: boolean;
          date: unknown;
          academicYear?: string;
          semester?: string;
          /** Derived from the item's own flags, never from the parent fine. */
          paymentState: "unpaid" | "pending" | "rejected" | "verified";
          isPayable: boolean;
          /** Set only when THIS item was in the declined submission. */
          latestRejectionReason?: string;
        }>;
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
        (paymentDoc) => paymentDoc.data() as PaymentLogRecord
      );

      const latestRejectionReason = getLatestRejectedReason(feePaymentLogs);
      const latestHistoryState = getLatestPaymentHistoryState(feePaymentLogs);

      const outstanding = outstandingOf(fee.balance, fee.amount);

      // Settlement is decided by what is still owed, not by the newest payment
      // log. A verified PARTIAL payment leaves a real balance; reading the log
      // alone marked the fee "verified", which made it unpayable while it still
      // showed an amount — the student could see the debt but not clear it.
      const isSettled =
        SETTLED_RECORD_STATUSES.has(String(fee.status)) || outstanding <= 0;
      const hasPendingSubmission = latestHistoryState === "pending";

      // Anything past `isSettled` still owes money, so it is either awaiting a
      // decision, freshly declined, or simply unpaid — a stale "verified" from
      // a partial payment can no longer win here.
      const paymentState: "unpaid" | "pending" | "rejected" | "verified" =
        hasPendingSubmission
          ? "pending"
          : isSettled
            ? "verified"
            : latestHistoryState === "rejected"
              ? "rejected"
              : "unpaid";

      // Payable whenever money is still owed and nothing is awaiting review.
      const isPayable = !isSettled && !hasPendingSubmission;
      const existing = grouped.get(fee.orgId) ?? {
        orgId: fee.orgId,
        feeAmount: 0,
        fineAmount: 0,
        paymentSummary: { pending: 0, verified: 0, rejected: 0, unpaid: 0 },
        fees: [],
        fines: [],
        fineItems:[],
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
        dueDate: toIsoDate(fee.dueDate),
        latestRejectionReason,
        isPayable,
        // Falls back to the term that was actually requested. The old
        // hard-coded "2025-2026"/"2nd" disagreed with the form's "2026-2027"/
        // "1st" fallback, and both feed the clearance document id — so a record
        // missing its term landed in a different clearance doc depending on
        // which path filled the blank.
        academicYear: fee.academicYear || AY || "",
        semester: fee.semester || semester || "",
        paymentState,
      });

      grouped.set(fee.orgId, existing);
    }

    // Process Fines
    for (const doc of finesSnapshot.docs) {
      const fine = { id: doc.id, ...doc.data() } as FineRecord;
      if (!fine.orgId) continue;
      if (fine.metadata?.isArchived) continue;

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
        fineItemsQuery.get()
      ]);

      const finePaymentLogs = finePaymentHistorySnapshot.docs.map(
        (paymentDoc) => paymentDoc.data() as PaymentLogRecord
      );

      const latestRejectionReason = getLatestRejectedReason(finePaymentLogs);
      const rejectedRefIds = latestRejectionReason
        ? await getRejectedRefIds(finePaymentLogs)
        : new Set<string>();

      // ── Per-item state ───────────────────────────────────────────────────
      // `isPaid` / `isPending` on the item are the authoritative record: the
      // admin sets them on every approval (`markFineItemsAsPaid`) and every
      // rejection (`markFineItemsAsNotPending`). The parent's `status` is a
      // roll-up — its own `recalculateFines` defines "pending" as "at least one
      // item is pending" — so reading it as the state of EVERY item made one
      // submitted item freeze all the student's other fines.
      const items = [];
      for (const itemDoc of fineItemsSnapshot.docs) {
        const fineItem = { id: itemDoc.id, ...itemDoc.data() } as FineItem;

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
          // Carried so the submit step never has to guess the term. Falls back
          // to the requested term rather than to a hard-coded academic year.
          academicYear: fineItem.academicYear || AY || undefined,
          semester: fineItem.semester || semester || undefined,
          paymentState: itemState,
          isPayable: itemState === "unpaid" || itemState === "rejected",
          latestRejectionReason: rejected ? latestRejectionReason : undefined,
        });
      }

      // Scoped to the items actually listed. The parent's `balance` accumulates
      // across every term, so using it here showed a total that could not be
      // reconciled against the (term-filtered) items shown beneath it.
      const outstanding = items
        .filter((item) => item.isPayable)
        .reduce((sum, item) => sum + item.amount, 0);

      // Roll the group up FROM the items, so the summary and the breakdown can
      // never disagree.
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

      if (AY && semester && fineItemsSnapshot.empty) continue;

      const existing = grouped.get(fine.orgId) ?? {
        orgId: fine.orgId,
        feeAmount: 0,
        fineAmount: 0,
        paymentSummary: { pending: 0, verified: 0, rejected: 0, unpaid: 0 },
        fees: [],
        fines: [],
        fineItems: [],
      };

      // `fine.fineItemsCount` used to gate the unpaid tally. When the field was
      // missing, `undefined > 0` is false, so a genuinely unpaid fine never
      // reached the summary — and `isOrganizationPayable` reads that summary,
      // which could lock the student out of the organization entirely. The
      // rolled-up state already knows whether anything is owed.
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
        date: toIsoDate(fine.dueDate) || toIsoDate(fine.lastFineIssuedAt),
        reason: fine.reason || "Fine/penalty charge",
        latestRejectionReason,
        isPayable,
        paymentState,
      });

      items.forEach((item) => {
        existing.fineItems.push(item)
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

        return {
          id: orgId,
          name: orgData?.name ? String(orgData.name) : display.name,
          acronym: display.acronym,
          // `orgLogoUrl` is the field all three admin apps write and read.
          orgLogoUrl: orgData?.orgLogoUrl ? String(orgData.orgLogoUrl) : null,
          outstandingAmount: due.feeAmount + due.fineAmount,
          feeAmount: due.feeAmount,
          fineAmount: due.fineAmount,
          paymentSummary: due.paymentSummary,
          fees: due.fees,
          fines: due.fines,
          fineItems: due.fineItems,
          orgTreasurerName: orgData?.orgTreasurerName || null,
          orgTreasurerUrl: orgData?.orgTreasurerUrl || null,
          orgTreasurerNumber: orgData?.orgTreasurerNumber || null,
          orgAuditorName: orgData?.orgAuditorName || null,
          orgAuditorUrl: orgData?.orgAuditorUrl || null,
          orgAuditorNumber: orgData?.orgAuditorNumber || null,
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
