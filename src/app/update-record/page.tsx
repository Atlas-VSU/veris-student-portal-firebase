"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpdateStudentRecordForm } from "@/features/update-record/UpdateStudentRecordForm";
import { useVerifyUpdateToken } from "./hooks/useVerifyUpdateToken";

function UpdateRecordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const { status, data, errorMessage } = useVerifyUpdateToken(token);

  if (status === "idle" || status === "verifying") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <h2 className="text-xl font-bold font-serif text-foreground">
            Verifying your update link…
          </h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we validate your access.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border border-destructive/20 p-0 shadow-float">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-destructive mb-3">
              Access Denied
            </h2>
            <p className="text-sm text-muted-foreground mb-8">{errorMessage}</p>
            <Button
              onClick={() => router.push("/")}
              variant="default"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <UpdateStudentRecordForm
      token={token!}
      studentId={data!.studentId}
      email={data!.email}
      initialValues={data!.student}
    />
  );
}

export default function UpdateRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      }
    >
      <UpdateRecordContent />
    </Suspense>
  );
}
