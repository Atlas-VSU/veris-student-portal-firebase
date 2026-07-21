import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/** Shown after a successful self-registration submission. */
export function RegistrationSuccess() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border border-border/50 shadow-soft">
        <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-primary">
            Registration Submitted
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thanks for registering! Your application has been received and is
            now <span className="font-bold text-foreground">pending verification</span>. Once your registration has been reviewed, a notification will be sent to your email.
          </p>
          <p className="text-xs text-muted-foreground bg-secondary/5 border border-secondary/20 rounded-[1rem] p-4 max-w-sm">
            If you do not see it in your inbox, please check your spam folder.
          </p>
          <Button asChild className="w-full mt-2">
            <Link href="/" className="flex items-center gap-2 justify-center">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
