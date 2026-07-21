"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  Loader2,
  Mail,
  Search,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface UpdateInformationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProgramOption {
  value: string;
  label: string;
}

const FALLBACK_PROGRAMS: ProgramOption[] = [
  { value: "bscs", label: "Bachelor of Science in Computer Science" },
  { value: "bsit", label: "Bachelor of Science in Information Technology" },
];

const verifySchema = z.object({
  studentId: z
    .string()
    .min(1, "Student ID is required")
    .regex(/^\d{2}-\d-\d{5}$/, "Format: XX-X-XXXXX (e.g. 25-1-12345)"),
  programId: z.string().min(1, "Please select your program"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

type Step = "verify" | "email" | "sent";

export function UpdateInformationDialog({
  isOpen,
  onOpenChange,
}: UpdateInformationDialogProps) {
  const [step, setStep] = useState<Step>("verify");
  const [programs, setPrograms] = useState<ProgramOption[]>(FALLBACK_PROGRAMS);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [programLoadError, setProgramLoadError] = useState<string | null>(null);

  // Step 1
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedStudentId, setVerifiedStudentId] = useState("");
  const [verifiedProgramId, setVerifiedProgramId] = useState("");
  const [verifiedStudentName, setVerifiedStudentName] = useState("");

  // Step 2
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { studentId: "", programId: "" },
  });

  const programValue = watch("programId");

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setIsLoadingPrograms(true);
      setProgramLoadError(null);
      try {
        const res = await fetch("/api/programs");
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.programs)) {
          throw new Error(data.error || "Failed to load programs.");
        }
        const mapped: ProgramOption[] = data.programs
          .map((p: any) => ({ value: p.id, label: p.name || p.shortName || p.acronym || p.id }))
          .sort((a: ProgramOption, b: ProgramOption) => a.label.localeCompare(b.label));
        if (mapped.length > 0) setPrograms(mapped);
      } catch {
        setProgramLoadError("Unable to load live programs. Using fallback list.");
        setPrograms(FALLBACK_PROGRAMS);
      } finally {
        setIsLoadingPrograms(false);
      }
    };
    void load();
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep("verify");
      setVerifyError(null);
      setVerifiedStudentId("");
      setVerifiedProgramId("");
      setVerifiedStudentName("");
      setEmail("");
      resetForm();
    }
    onOpenChange(open);
  };

  const onVerifySubmit = async (data: VerifyFormData) => {
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const res = await fetch("/api/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: data.studentId.trim(), program: data.programId }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Unable to verify student.");
      setVerifiedStudentId(data.studentId.trim());
      setVerifiedProgramId(data.programId);
      setVerifiedStudentName(result.student?.name ?? "");
      setStep("email");
    } catch (err: any) {
      setVerifyError(err.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email address."); return; }
    setIsSending(true);
    try {
      const res = await fetch("/api/send-update-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: verifiedStudentId, programId: verifiedProgramId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send link.");
      toast.success("Update link sent!");
      setStep("sent");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-card text-foreground border border-border/50 rounded-[2rem] p-8 shadow-float overflow-hidden">
        {step === "verify" && (
          <>
            <DialogHeader className="items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold font-serif text-foreground">
                Verify Your Identity
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm max-w-sm">
                Enter your Student ID and program to confirm your identity before updating your record.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onVerifySubmit)} className="space-y-5 mt-6">
              <div className="space-y-2">
                <Label className="text-foreground font-bold text-sm">Student ID</Label>
                <Input
                  {...register("studentId")}
                  placeholder="25-1-12345"
                  disabled={isVerifying}
                />
                {errors.studentId ? (
                  <p className="text-xs text-destructive">{errors.studentId.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Format: XX-X-XXXXX</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-bold text-sm">Program</Label>
                <Select
                  disabled={isLoadingPrograms || isVerifying}
                  value={programValue}
                  onValueChange={(val) => { setValue("programId", val, { shouldValidate: true }); clearErrors("programId"); }}
                >
                  <SelectTrigger className={`w-full !bg-white/50 !text-foreground !border-border hover:bg-accent/10 focus-visible:!ring-primary/30 focus-visible:!ring-offset-2 truncate rounded-full h-12 px-6 ${errors.programId ? "border-destructive" : ""}`}>
                    <SelectValue placeholder={isLoadingPrograms ? "Loading programs…" : "Select your program"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-border rounded-xl">
                    {programs.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-foreground focus:bg-primary/10 focus:text-foreground">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {programLoadError && <p className="text-xs text-amber-600">{programLoadError}</p>}
                {errors.programId && <p className="text-xs text-destructive">{errors.programId.message}</p>}
              </div>

              {verifyError && (
                <p className="text-sm text-destructive rounded-[1rem] bg-destructive/10 border border-destructive/20 px-4 py-3 font-medium">
                  {verifyError}
                </p>
              )}

              <div className="flex flex-col gap-3 pt-3">
                <Button type="submit" disabled={isVerifying} className="w-full">
                  {isVerifying ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</>) : "Verify Identity"}
                </Button>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isVerifying} className="w-full">
                  Cancel
                </Button>
              </div>
            </form>
          </>
        )}

        {step === "email" && (
          <>
            <DialogHeader className="items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <UserCheck className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold font-serif text-foreground">
                Identity Verified
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm max-w-sm">
                {verifiedStudentName ? `Welcome, ${verifiedStudentName}. ` : ""}
                Enter the email address where we should send your update link.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSendLink} className="space-y-5 mt-6">
              <div className="space-y-2">
                <Label className="text-foreground font-bold text-sm">Email Address</Label>
                <Input
                  type="email"
                  placeholder="your_address@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This email will also be saved to your student record.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-3">
                <Button type="submit" disabled={isSending} className="w-full">
                  {isSending ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending Link…</>) : (<><Mail className="w-4 h-4 mr-2" />Send Update Link</>)}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep("verify")} disabled={isSending} className="w-full">
                  <ChevronLeft className="w-4 h-4 mr-1" />Back
                </Button>
              </div>
            </form>
          </>
        )}

        {step === "sent" && (
          <>
            <DialogHeader className="items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold font-serif text-foreground">
                Update Link Sent
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm max-w-sm">
                We&apos;ve sent an update link to{" "}
                <span className="font-bold text-foreground">{email}</span>.
                Click the link in the email to update your record.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-6">
              <p className="text-xs text-center text-muted-foreground">
                If you didn&apos;t receive the email, please check your spam folder or try again in a few minutes.
              </p>
              <Button onClick={() => handleOpenChange(false)} className="w-full">
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
