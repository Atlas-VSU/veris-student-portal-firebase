import { NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin.config";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
];

export async function proxyOrganizationLogoResponse(rawUrl: string): Promise<NextResponse> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "Invalid logo URL protocol." }, { status: 400 });
    }
    if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
      return NextResponse.json({ error: "Disallowed logo host." }, { status: 400 });
    }

    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to fetch logo." }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "Upstream resource is not an image." }, { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid logo URL." }, { status: 400 });
  }
}

export type PaymentLogForReceipt = {
  id?: string;
  status?: string;
  rejectionReason?: string | null;
  paymentProofId?: string;
  receiptCode?: string;
  amount?: number;
  paymentMethod?: string;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  paidAt?: unknown;
  createdAt?: unknown;
  verifiedAt?: unknown;
  metaData?: {
    updatedAt?: unknown;
  };
  metadata?: {
    updatedAt?: unknown;
  };
};

export type ProofRecord = {
  id: string;
  orgId?: string;
  studentId?: string;
  userName?: string;
  amount?: number;
  paymentMethod?: string;
  receiptCode?: string;
  status?: string;
  isArchived?: boolean;
  referenceId?: string;
  academicYear?: string;
  semester?: string;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: unknown;
  updatedAt?: unknown;
  submittedAt?: unknown;
  metadata?: {
    items?: Array<{
      refId?: string;
      title?: string;
      amount?: number;
      paymentType?: string;
      parentFineId?: string;
      academicYear?: string;
      semester?: string;
    }>;
  };
};

export type ResolvedReceiptItem = {
  name: string;
  type: "fees" | "fines";
  amount: number;
};

export type ResolvedReceiptData = {
  receiptId: string;
  studentName: string;
  studentId: string;
  orgName: string;
  orgAcronym: string;
  orgLogoUrl?: string | null;
  items: ResolvedReceiptItem[];
  total: number;
  date: string;
  verifiedByName: string;
  paymentMethod: string;
  AY: string;
  semester: string;
};

export type FeeDueInternal = {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate?: string;
  latestRejectionReason?: string;
  isPayable: boolean;
  academicYear: string;
  semester: string;
  paymentState: "unpaid" | "pending" | "rejected" | "verified";
  isWaived: boolean;
  latestVerifiedLog?: PaymentLogForReceipt;
  fallbackDate?: string;
};

export type FineDueInternal = {
  id: string;
  description: string;
  amount: number;
  date?: string;
  reason: string;
  latestRejectionReason?: string;
  isPayable: boolean;
  paymentState: "unpaid" | "pending" | "rejected" | "verified";
  latestVerifiedLog?: PaymentLogForReceipt;
};

export type FineItemDueInternal = {
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
  paymentState: "unpaid" | "pending" | "rejected" | "verified";
  isPayable: boolean;
  latestRejectionReason?: string;
};

const asNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const toIsoDate = (value: unknown): string | undefined => {
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

export const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  if (typeof value === "object" && value && "toDate" in value) {
    const date = (value as { toDate?: () => Date }).toDate?.();
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

export const getLatestVerifiedPaymentLog = (
  logs: PaymentLogForReceipt[]
): PaymentLogForReceipt | undefined =>
  logs
    .filter((log) => log.status === "verified" || log.status === "approved")
    .sort(
      (a, b) =>
        Math.max(
          toMillis(b.verifiedAt),
          toMillis(b.metaData?.updatedAt),
          toMillis(b.metadata?.updatedAt),
          toMillis(b.paidAt),
          toMillis(b.createdAt)
        ) -
        Math.max(
          toMillis(a.verifiedAt),
          toMillis(a.metaData?.updatedAt),
          toMillis(a.metadata?.updatedAt),
          toMillis(a.paidAt),
          toMillis(a.createdAt)
        )
    )[0];

const resolveVerifierName = (verifiedByName: unknown, verifiedBy: unknown): string => {
  if (typeof verifiedByName === "string" && verifiedByName.trim().length > 0) {
    return verifiedByName.trim();
  }
  // Legacy records in `addOfflineFinesPayment` stored the verifier's full name in `verifiedBy`.
  if (
    typeof verifiedBy === "string" &&
    verifiedBy.trim().length > 0 &&
    verifiedBy.trim().includes(" ")
  ) {
    return verifiedBy.trim();
  }
  return "Organization Administrator";
};

export async function loadStudentReceiptContext(studentId: string) {
  const [userSnapshot, proofsSnapshot] = await Promise.all([
    adminDb.collection("users").where("studentId", "==", studentId).get(),
    adminDb.collection("proofOfPayments").where("studentId", "==", studentId).get(),
  ]);

  const userDoc =
    userSnapshot.docs.find((d) => d.data().isDeleted !== true) ?? userSnapshot.docs[0];
  const userData = userDoc?.data();
  const resolvedStudentName =
    `${userData?.firstName ?? ""} ${userData?.lastName ?? ""}`.trim() ||
    String(userData?.name ?? "").trim() ||
    studentId;

  const verifiedProofsById = new Map<string, ProofRecord>();
  for (const proofDoc of proofsSnapshot.docs) {
    const data = proofDoc.data();
    if (data.isArchived === true) continue;
    if (data.status === "verified" || data.status === "approved") {
      verifiedProofsById.set(proofDoc.id, {
        id: proofDoc.id,
        ...data,
      } as ProofRecord);
    }
  }

  const ensureProofLoaded = async (proofId: string | undefined) => {
    if (!proofId || verifiedProofsById.has(proofId)) return;
    try {
      const snap = await adminDb.collection("proofOfPayments").doc(proofId).get();
      if (!snap.exists) return;
      const data = snap.data();
      if (!data || data.isArchived === true) return;
      if (data.status === "verified" || data.status === "approved") {
        verifiedProofsById.set(snap.id, {
          id: snap.id,
          ...data,
        } as ProofRecord);
      }
    } catch {
      // Non-fatal: falls back to Tier 2 (paymentHistory) or Tier 3 (settled record)
    }
  };

  return {
    resolvedStudentName,
    verifiedProofsById,
    ensureProofLoaded,
  };
}

export function attachOrganizationReceipts(params: {
  orgId: string;
  orgName: string;
  orgAcronym: string;
  orgLogoUrl: string | null;
  studentId: string;
  resolvedStudentName: string;
  defaultAY?: string;
  defaultSemester?: string;
  verifiedProofsById: Map<string, ProofRecord>;
  fees: FeeDueInternal[];
  fines: FineDueInternal[];
  fineItems: FineItemDueInternal[];
}) {
  const {
    orgId,
    orgName,
    orgAcronym,
    orgLogoUrl,
    studentId,
    resolvedStudentName,
    defaultAY = "",
    defaultSemester = "",
    verifiedProofsById,
    fees,
    fines,
    fineItems,
  } = params;

  const orgProofs = Array.from(verifiedProofsById.values())
    .filter((p) => !p.orgId || p.orgId === orgId)
    .sort(
      (a, b) =>
        Math.max(toMillis(b.verifiedAt), toMillis(b.updatedAt), toMillis(b.submittedAt)) -
        Math.max(toMillis(a.verifiedAt), toMillis(a.updatedAt), toMillis(a.submittedAt))
    );

  const proofByItemRefId = new Map<string, ProofRecord>();
  const proofByReferenceId = new Map<string, ProofRecord>();
  for (const proof of orgProofs) {
    if (
      typeof proof.referenceId === "string" &&
      proof.referenceId &&
      !proofByReferenceId.has(proof.referenceId)
    ) {
      proofByReferenceId.set(proof.referenceId, proof);
    }
    for (const item of proof.metadata?.items ?? []) {
      if (typeof item.refId === "string" && item.refId && !proofByItemRefId.has(item.refId)) {
        proofByItemRefId.set(item.refId, proof);
      }
    }
  }

  const buildReceiptFromProof = (
    proof: ProofRecord,
    fallbackItems: ResolvedReceiptItem[],
    fallbackAY: string,
    fallbackSemester: string
  ): ResolvedReceiptData => {
    const proofItems =
      Array.isArray(proof.metadata?.items) && proof.metadata!.items.length > 0
        ? proof.metadata!.items.map((i) => ({
            name: String(
              i.title || (i.paymentType === "fines" ? "Fine Payment" : "Organization Fee")
            ),
            type: (i.paymentType === "fines" ? "fines" : "fees") as "fees" | "fines",
            amount: asNumber(i.amount),
          }))
        : fallbackItems;
    const total =
      asNumber(proof.amount) > 0
        ? asNumber(proof.amount)
        : proofItems.reduce((sum, i) => sum + i.amount, 0);
    const receiptId =
      (typeof proof.receiptCode === "string" && proof.receiptCode.trim()) ||
      `${orgAcronym}-${proof.id.slice(0, 8).toUpperCase()}`;
    const date =
      toIsoDate(proof.verifiedAt) ||
      toIsoDate(proof.updatedAt) ||
      toIsoDate(proof.submittedAt) ||
      "Verified on Record";

    return {
      receiptId,
      studentName:
        (typeof proof.userName === "string" && proof.userName.trim()) || resolvedStudentName,
      studentId,
      orgName,
      orgAcronym,
      orgLogoUrl,
      items: proofItems,
      total,
      date,
      verifiedByName: resolveVerifierName(proof.verifiedByName, proof.verifiedBy),
      paymentMethod:
        (typeof proof.paymentMethod === "string" && proof.paymentMethod.trim()) || "cash",
      AY: proof.academicYear || fallbackAY || defaultAY,
      semester: proof.semester || fallbackSemester || defaultSemester,
    };
  };

  const buildReceiptFromLogOrRecord = (
    sourceId: string,
    log: PaymentLogForReceipt | undefined,
    fallbackItems: ResolvedReceiptItem[],
    fallbackTotal: number,
    fallbackDate: string | undefined,
    fallbackAY: string,
    fallbackSemester: string
  ): ResolvedReceiptData => {
    if (log) {
      const logId = log.id || sourceId;
      const receiptId =
        (typeof log.receiptCode === "string" && log.receiptCode.trim()) ||
        `${orgAcronym}-${logId.slice(0, 8).toUpperCase()}`;
      const date =
        toIsoDate(log.verifiedAt) ||
        toIsoDate(log.paidAt) ||
        toIsoDate(log.createdAt) ||
        fallbackDate ||
        "Verified on Record";
      const total = asNumber(log.amount) > 0 ? asNumber(log.amount) : fallbackTotal;
      return {
        receiptId,
        studentName: resolvedStudentName,
        studentId,
        orgName,
        orgAcronym,
        orgLogoUrl,
        items: fallbackItems,
        total,
        date,
        verifiedByName: resolveVerifierName(log.verifiedByName, log.verifiedBy),
        paymentMethod:
          (typeof log.paymentMethod === "string" && log.paymentMethod.trim()) || "cash",
        AY: fallbackAY || defaultAY,
        semester: fallbackSemester || defaultSemester,
      };
    }

    return {
      receiptId: `${orgAcronym}-${sourceId.slice(0, 8).toUpperCase()}`,
      studentName: resolvedStudentName,
      studentId,
      orgName,
      orgAcronym,
      orgLogoUrl,
      items: fallbackItems,
      total: fallbackTotal,
      date: fallbackDate || "Verified on Record",
      verifiedByName: "Organization Administrator",
      paymentMethod: "Recorded Payment",
      AY: fallbackAY || defaultAY,
      semester: fallbackSemester || defaultSemester,
    };
  };

  const resolvedFees = fees.map((fee) => {
    let receipt: ResolvedReceiptData | undefined;
    if (fee.paymentState === "verified" && !fee.isWaived) {
      const fallbackItems: ResolvedReceiptItem[] = [
        {
          name: fee.description,
          type: "fees",
          amount: fee.paidAmount > 0 ? fee.paidAmount : fee.amount,
        },
      ];
      const matchedProof =
        (fee.latestVerifiedLog?.paymentProofId
          ? verifiedProofsById.get(fee.latestVerifiedLog.paymentProofId)
          : undefined) ||
        proofByItemRefId.get(fee.id) ||
        proofByReferenceId.get(fee.id);

      receipt = matchedProof
        ? buildReceiptFromProof(matchedProof, fallbackItems, fee.academicYear, fee.semester)
        : buildReceiptFromLogOrRecord(
            fee.id,
            fee.latestVerifiedLog,
            fallbackItems,
            fee.paidAmount > 0 ? fee.paidAmount : fee.amount,
            fee.fallbackDate,
            fee.academicYear,
            fee.semester
          );
    }

    const { isWaived, latestVerifiedLog, fallbackDate, ...publicFee } = fee;
    return {
      ...publicFee,
      receipt,
    };
  });

  const paidFineItemsByParent = new Map<string, ResolvedReceiptItem[]>();
  for (const item of fineItems) {
    if (item.isPaid && !item.isWaived) {
      const list = paidFineItemsByParent.get(item.parentFineId) ?? [];
      list.push({
        name: item.title || "Fine Payment",
        type: "fines",
        amount: item.amount,
      });
      paidFineItemsByParent.set(item.parentFineId, list);
    }
  }

  const fineById = new Map(fines.map((f) => [f.id, f]));

  const proofCoversFineItem = (
    proof: ProofRecord | undefined,
    itemRefId: string,
    parentFineId: string
  ): ProofRecord | undefined => {
    if (!proof) return undefined;
    const items = proof.metadata?.items;
    if (!Array.isArray(items) || items.length === 0) return proof;
    return items.some((entry) => entry.refId === itemRefId || entry.refId === parentFineId)
      ? proof
      : undefined;
  };

  const resolvedFineItems = fineItems.map((item) => {
    let receipt: ResolvedReceiptData | undefined;
    if (item.isPaid && !item.isWaived) {
      const parentFine = fineById.get(item.parentFineId);
      const parentPaidItems = paidFineItemsByParent.get(item.parentFineId) ?? [
        {
          name: item.title || "Fine Payment",
          type: "fines",
          amount: item.amount,
        },
      ];
      const parentPaidTotal = parentPaidItems.reduce((sum, i) => sum + i.amount, 0);

      const matchedProof =
        proofByItemRefId.get(item.refId) ||
        proofCoversFineItem(
          parentFine?.latestVerifiedLog?.paymentProofId
            ? verifiedProofsById.get(parentFine.latestVerifiedLog.paymentProofId)
            : undefined,
          item.refId,
          item.parentFineId
        ) ||
        proofCoversFineItem(
          proofByReferenceId.get(item.parentFineId),
          item.refId,
          item.parentFineId
        );

      receipt = matchedProof
        ? buildReceiptFromProof(
            matchedProof,
            parentPaidItems,
            item.academicYear || defaultAY,
            item.semester || defaultSemester
          )
        : buildReceiptFromLogOrRecord(
            item.parentFineId || item.refId,
            parentFine?.latestVerifiedLog,
            parentPaidItems,
            parentPaidTotal > 0 ? parentPaidTotal : item.amount,
            toIsoDate(item.date) || parentFine?.date,
            item.academicYear || defaultAY,
            item.semester || defaultSemester
          );
    }

    return {
      ...item,
      receipt,
    };
  });

  const resolvedFines = fines.map(({ latestVerifiedLog, ...publicFine }) => publicFine);

  return {
    fees: resolvedFees,
    fines: resolvedFines,
    fineItems: resolvedFineItems,
  };
}
