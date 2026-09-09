import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin.config";
import { Program } from "@/types/program";
import { maskEmail } from "@/lib/email";

type VerifyStudentRequest = {
  studentId?: string;
  program?: string;
};

const normalize = (value: string | undefined | null) =>
  (value ?? "").trim().toLowerCase();

const buildProgramCandidates = (program: Program | null) => {
  if (!program) return [];

  return Array.from(
    new Set(
      [program.id, program.name, program.acronym, program.shortName, program.code]
        .filter(Boolean)
        .map((value) => normalize(String(value)))
    )
  );
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyStudentRequest;
    const studentId = body.studentId?.trim();
    const requestedProgram = normalize(body.program);

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID is required.",
        },
        { status: 400 }
      );
    }

    if (!requestedProgram) {
      return NextResponse.json(
        {
          success: false,
          error: "Program is required.",
        },
        { status: 400 }
      );
    }

    // Deliberately unfiltered by isDeleted. A student retired by the roster
    // sync still owes — and can still settle — dues from the terms they WERE
    // enrolled in, so refusing them at verification left those records
    // unreachable and unpayable. A live record always wins when both exist.
    const userSnapshot = await adminDb
      .collection("users")
      .where("studentId", "==", studentId)
      .get();

    if (userSnapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          error: "Student record not found.",
        },
        { status: 404 }
      );
    }

    const userDoc =
      userSnapshot.docs.find((doc) => doc.data().isDeleted !== true) ??
      userSnapshot.docs[0];
    const userData = userDoc.data();
    const isArchived = userData.isDeleted === true;

    if (userData.status !== "approved") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Your account is not yet approved. Please contact the administrator to proceed." 
        }, 
        { status: 403 }
      );
    }

    if (userData.role && userData.role !== "user") {
      return NextResponse.json(
        {
          success: false,
          error: "Student record not found.",
        },
        { status: 404 }
      );
    }

    let program: Program | null = null;
    if (userData.programId) {
      const programDoc = await adminDb.collection("programs").doc(userData.programId).get();
      if (programDoc.exists) {
        program = {
          id: programDoc.id,
          ...programDoc.data(),
        } as Program;
      }
    }

    const allowedProgramValues = buildProgramCandidates(program);

    if (!allowedProgramValues.includes(requestedProgram)) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID and program do not match our records.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      student: {
        id: userDoc.id,
        studentId: userData.studentId,
        name: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
        firstName: userData.firstName ?? "",
        lastName: userData.lastName ?? "",
        maskedEmail: userData.email ? maskEmail(userData.email) : "",
        /** Retired by the roster sync — no longer enrolled, but historical
         *  terms remain payable. Drives the term-step messaging. */
        isArchived,
        program: program
          ? {
              id: program.id,
              name: program.name,
              acronym: program.acronym,
              shortName: program.shortName,
              code: program.code ?? null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error verifying student:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify student.",
      },
      { status: 500 }
    );
  }
}
