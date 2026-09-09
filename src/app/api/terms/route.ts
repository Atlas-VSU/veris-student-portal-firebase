import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin.config";

export async function GET(request: NextRequest) {
  try {
    const snapshot = await adminDb
      .collection("terms")
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          terms: [],
          message: "No terms found.",
        },
        { status: 200 }
      );
    }

    const studentId = request.nextUrl.searchParams.get("studentId")?.trim();

    /**
     * Which terms this student has any record in.
     *
     * This is deliberately NOT an attempt to reconstruct enrolment history —
     * nothing in the data says "this student was enrolled in this term". What
     * it says is whether the student left a trace there: a clearance document,
     * dues, or a payment. That trace is the only defensible basis for showing
     * a term, and it is also exactly what the student would want to look at.
     *
     * Archived records count. The roster sync archives the ACTIVE term's
     * records when it retires a student, so excluding them would hide the very
     * history this is meant to surface.
     */
    const recordTermKeys = new Set<string>();
    if (studentId) {
      const termKey = (AY: unknown, semester: unknown) => `${String(AY)}::${String(semester)}`;

      const [clearanceSnap, feesSnap, finesSnap, proofsSnap] = await Promise.all([
        adminDb.collection("clearanceStatus").where("studentId", "==", studentId).get(),
        adminDb.collection("fees").where("studentId", "==", studentId).get(),
        adminDb.collection("fines").where("studentId", "==", studentId).get(),
        adminDb.collection("proofOfPayments").where("studentId", "==", studentId).get(),
      ]);

      for (const doc of [...clearanceSnap.docs, ...feesSnap.docs, ...proofsSnap.docs]) {
        const data = doc.data();
        recordTermKeys.add(termKey(data.academicYear, data.semester));
      }

      // Fines carry their term on the items, not the parent document.
      const fineItemLookups = await Promise.all(
        finesSnap.docs.map((doc) => doc.ref.collection("fineItems").get())
      );

      for (const itemsSnap of fineItemLookups) {
        for (const itemDoc of itemsSnap.docs) {
          const data = itemDoc.data();
          recordTermKeys.add(termKey(data.academicYear, data.semester));
        }
      }
    }

    const terms = snapshot.docs.map((doc) => {
      const data = doc.data();
      const AY = data.AY || "";
      const semester = data.semester || "";
      return {
        id: doc.id,
        AY,
        semester,
        isActive: data.isActive || false,
        displayName: `${semester} · A.Y. ${AY}`,
        // Undefined when no studentId was supplied, so callers that do not ask
        // about a student keep the previous shape.
        hasRecords: studentId ? recordTermKeys.has(`${AY}::${semester}`) : undefined,
      };
    });

    terms.sort((a, b) => {
      if (a.AY !== b.AY) {
        return b.AY.localeCompare(a.AY);
      }
      return b.semester.localeCompare(a.semester);
    });

    return NextResponse.json({ success: true, terms }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error fetching terms [GET /api/terms]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching the terms.",
      },
      { status: 500 }
    );
  }
}
