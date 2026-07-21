import { NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin.config";
import { Program } from "@/types/program";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("programs").get();

    const programs = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Program)
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      programs,
    });
  } catch (error) {
    console.error("Error fetching programs:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch programs.",
      },
      { status: 500 }
    );
  }
}
