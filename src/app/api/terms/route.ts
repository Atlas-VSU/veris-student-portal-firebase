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

    const terms = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        AY: data.AY || "",
        semester: data.semester || "",
        isActive: data.isActive || false,
        displayName: `${data.semester} · A.Y. ${data.AY}`,
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
