import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/firebase/firebase-admin.config";
import { FieldValue } from "firebase-admin/firestore";
import { FieldPath } from "firebase-admin/firestore";

const unpaidDueSchema = z.object({
  refId:        z.string().min(1),
  title:        z.string(),
  amount:       z.number().positive(),
  paymentType:  z.enum(["fees", "fines"]),
  parentFineId: z.string().default(""),
  // Required, not defaulted. These build the clearance document id, so a
  // silent default files the payment against the wrong term — and the defaults
  // here ("2025-2026"/"2nd") disagreed with the ones the form used
  // ("2026-2027"/"1st"), so the same missing field produced two different
  // clearance documents depending on the path. Rejecting is the safe failure.
  academicYear: z.string().min(1, "Academic year is required for each due"),
  semester:     z.string().min(1, "Semester is required for each due"),
});

const submitPaymentSchema = z.object({
  userName:        z.string().min(2, "Name is required"),
  studentId:       z.string().min(1).regex(/^\d{2}-\d-\d{5}$/, "Invalid student ID format"),
  orgId:           z.string().min(1, "Organization is required"),
  amount:          z.number().positive("Amount must be greater than zero"),
  paymentMethod:   z.enum(["gcash", "bank_transfer", "cash"]),
  referenceNumber: z.string().optional(),
  senderNumber:    z.string().optional(),
  imageUrl:        z.string().optional(),
  notes:           z.string().optional(),
  dues:            z.array(unpaidDueSchema).min(1, "Select at least one due"),
  type:            z.string().default("bulk"),
  referenceId:     z.string().default("bulk_transaction"),
}).superRefine((values, ctx) => {
  if (values.paymentMethod === "gcash") {
    if (!values.senderNumber || !/^([+]?63|0)9\d{9}$/.test(values.senderNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["senderNumber"],
        message: "A valid sender number is required for GCash payments.",
      });
    }
    if (!values.referenceNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referenceNumber"],
        message: "Reference number is required for GCash payments.",
      });
    }
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = submitPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid request payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.dues.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one due must be selected for payment." },
        { status: 400 }
      );
    }

    const now = FieldValue.serverTimestamp();

    // Unfiltered, so a retired student is told WHY they cannot pay rather than
    // being reported as non-existent — verification already lets them in to
    // read their history.
    const userSnapshot = await adminDb
      .collection("users")
      .where("studentId", "==", payload.studentId)
      .get();

    if (userSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Student record not found." },
        { status: 404 }
      );
    }

    const userDoc =
      userSnapshot.docs.find((doc) => doc.data().isDeleted !== true) ??
      userSnapshot.docs[0];

    // The real enforcement of the read-only rule. The term step and the
    // selection step both hide payment for a retired student, but neither is a
    // guarantee — a replayed or hand-built request must not create a payment
    // against someone who is no longer enrolled.
    if (userDoc.data().isDeleted === true) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This student is no longer enrolled. Past records can be viewed, but no new payment can be submitted against them.",
        },
        { status: 403 }
      );
    }

    const userId = userDoc.id;

    const feeIds = payload.dues.filter(d => d.paymentType === "fees").map(d => d.refId);
    const fineItemIds = payload.dues.filter(d => d.paymentType === "fines").map(d => d.refId);

    const blockedIds = await checkForBlockedDues(feeIds, fineItemIds);
    if (blockedIds.fees.length > 0 || blockedIds.fines.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Some selected dues already have a pending or verified payment submission.",
          blocked: blockedIds,
        },
        { status: 409 }
      );
    }

    const feeDocsById = new Map<string, FirebaseFirestore.DocumentData>();
    if (feeIds.length > 0) {
      const feeDocs = await Promise.all(
        feeIds.map(id => adminDb.collection("fees").doc(id).get())
      );
      for (const feeDoc of feeDocs) {
        if (feeDoc.exists) {
          feeDocsById.set(feeDoc.id, feeDoc.data()!);
        }
      }
    }

    const batch = adminDb.batch();
    const proofRef = adminDb.collection("proofOfPayments").doc();
    const itemKeys: string[] = [];
    const items: object[] = [];
    // Every term touched by this submission. `clearanceId` used to be a single
    // variable reassigned on each pass, so when dues spanned two terms the
    // per-due `blockingItems` writes landed correctly but the parent
    // `status: "pending"` only reached whichever term happened to come last.
    const clearanceIds = new Set<string>();

    for (const due of payload.dues) {
      const parentId = due.paymentType === "fines" ? due.parentFineId : due.refId;

      const historyRef = adminDb
        .collection(due.paymentType).doc(parentId)
        .collection("paymentHistory").doc();

      batch.set(historyRef, {
        paymentNumber:   now, 
        amount:          due.amount,
        paymentMethod:   payload.paymentMethod,
        paymentProofId:  proofRef.id,
        paymentType:     due.paymentType,
        gcashReference:  payload.referenceNumber ?? null,
        senderNumber:    payload.senderNumber    ?? "",
        imageUrl:        payload.imageUrl        ?? "",
        status:          "pending",
        paidAt:          now,
        verifiedBy:      null,
        verifiedByName:  null,
        verifiedAt:      null,
        rejectionReason: null,
        notes:           payload.notes ?? `Online payment of ${due.amount} recorded for ${due.paymentType}`,
        metadata:        { source: "public_payment_portal", submittedBy: "student" },
        createdAt:       now,
      });

      const updatedAtField = due.paymentType === "fines" ? "metadata.updatedAt" : "updatedAt";
      batch.set(adminDb.collection(due.paymentType).doc(parentId), {
        status:           "pending",
        [updatedAtField]: now,
      }, { merge: true });

      const termSuffix = `:${due.academicYear}-${due.semester}`.replace(/\s/g, '_');
      const clearanceId = `${userId}${payload.orgId}${termSuffix}`;
      clearanceIds.add(clearanceId);

      batch.set(adminDb.collection("clearanceStatus").doc(clearanceId), {
        blockingItems: {
          [due.refId]: {
            pendingReview: true,
          },
        },
      }, {
        mergeFields: [
          new FieldPath("blockingItems", due.refId, "pendingReview"),
        ],
      });

      if (due.paymentType === "fines") {
        batch.set(adminDb.collection("fines").doc(due.parentFineId).collection("fineItems").doc(due.refId), {
          isPending: true,
        }, { merge: true });
      }

      items.push({
        refId:        due.refId,
        title:        due.title,
        amount:       due.amount,
        paymentType:  due.paymentType,
        parentFineId: due.paymentType === "fines" ? due.parentFineId : "",
        historyId:    historyRef.id,
        academicYear: due.academicYear,
        semester:     due.semester,
      });

      if (due.paymentType === "fees") {
        const feeItemId = feeDocsById.get(due.refId)?.feeItemId;
        if (feeItemId) {
          itemKeys.push(feeItemId);
        }
      } else if (due.paymentType === "fines") {
        itemKeys.push(due.parentFineId);
      }
    }

    batch.set(proofRef, {
      orgId:           payload.orgId,
      academicYear:    payload.dues[0]?.academicYear ?? "2025-2026",
      semester:        payload.dues[0]?.semester ?? "2nd",
      userId,
      userName:        payload.userName,
      studentId:       payload.studentId,
      paymentType:     payload.type,
      paymentMethod:   payload.paymentMethod,
      referenceId:     payload.referenceId,
      referenceNumber: payload.referenceNumber ?? "",
      senderNumber:    payload.senderNumber    ?? "",
      amount:          payload.amount,
      isArchived:      false,
      imageUrl:        payload.imageUrl        ?? "",
      status:          "pending",
      submittedAt:     now,
      rejectionReason: "",
      notes:           payload.notes ?? "Public payment portal submission.",
      verifiedBy:      null,
      verifiedByName:  null,
      verifiedAt:      null,
      updatedAt:       now,
      metadata: {
        source:      "public_payment_portal",
        submittedBy: "student",
        items,
      },
      itemKeys,
    });

    // One write per term touched, not just the last one. `recalculateClearanceStatus`
    // on the admin side recomputes this from blockingItems, so "pending" here
    // matches the vocabulary it already uses ('cleared' | 'pending' | 'not_cleared').
    for (const clearanceId of clearanceIds) {
      batch.set(adminDb.collection("clearanceStatus").doc(clearanceId), {
        status: "pending",
      }, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Payment submitted successfully.",
      proofId: proofRef.id,
    });

  } catch (error) {
    console.error("Error submitting payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit payment. Please try again." },
      { status: 500 }
    );
  }
}

/** Settled in the admin apps' vocabulary — see student-dues for the full set. */
const SETTLED_RECORD_STATUSES = new Set(["paid", "waived"]);

async function checkForBlockedDues(feeIds: string[], fineIds: string[]) {
  /**
   * A record is blocked while a submission is awaiting review, or once it is
   * fully settled.
   *
   * "verified" used to block on its own, which made partial payments
   * impossible: the admin's `approvePaymentTransaction` marks a fee "partial"
   * and leaves a real balance, but the verified log from that first instalment
   * then blocked every attempt to clear the remainder. Settlement is now read
   * from the record itself — the balance the admin maintains — so a part-paid
   * fee stays payable while a fully paid one is still refused.
   */
  const isBlocked = async (col: string, docId: string) => {
    const [pendingSnap, recordSnap] = await Promise.all([
      adminDb
        .collection(col).doc(docId)
        .collection("paymentHistory")
        .where("status", "==", "pending")
        .limit(1)
        .get(),
      adminDb.collection(col).doc(docId).get(),
    ]);

    if (!pendingSnap.empty) return docId;

    const record = recordSnap.data();
    if (!record) return null;

    const balance = record.balance;
    const settled =
      SETTLED_RECORD_STATUSES.has(String(record.status)) ||
      (typeof balance === "number" && balance <= 0);

    return settled ? docId : null;
  };

  const [blockedFees, blockedFines] = await Promise.all([
    Promise.all(feeIds.map(id => isBlocked("fees",  id))),
    Promise.all(fineIds.map(id => isBlocked("fines", id))),
  ]);

  return {
    fees:  blockedFees.filter(Boolean)  as string[],
    fines: blockedFines.filter(Boolean) as string[],
  };
}
