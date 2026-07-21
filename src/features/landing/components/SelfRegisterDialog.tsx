"use client";

import { useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendRegistrationLink } from "@/features/self-register/hooks/useSendRegistrationLink";

interface SelfRegisterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelfRegisterDialog({ isOpen, onOpenChange }: SelfRegisterDialogProps) {
  const [email, setEmail] = useState("");
  const { sendRegistrationLink, isSending, sendSuccess, reset } = useSendRegistrationLink();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail("");
      reset();
    }
    onOpenChange(open);
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendRegistrationLink(email);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-card text-foreground border border-border/50 rounded-[2rem] p-8 shadow-float overflow-hidden">
        <DialogHeader className="items-center text-center">
          {!sendSuccess ? (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Mail className="w-7 h-7 text-primary" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
          )}
          <DialogTitle className="text-2xl font-bold font-serif text-foreground">
            {!sendSuccess ? "Verify Your Email" : "Verification Link Sent"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm max-w-sm">
            {!sendSuccess
              ? "Self-registered students are required to verify their email before registration. We will send a secure self-registration link to your inbox."
              : `We've sent a link to ${email}. Click the link in the email to proceed with your registration.`}
          </DialogDescription>
        </DialogHeader>

        {!sendSuccess ? (
          <form onSubmit={handleSendLink} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="your_address@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                required
              />
            </div>

            <div className="flex flex-col gap-3 pt-3">
              <Button
                type="submit"
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending Link...
                  </>
                ) : (
                  "Send Verification Link"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSending}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-6">
            <p className="text-xs text-center text-muted-foreground">
              If you didn't receive the email, please check your spam folder or try again in a few minutes.
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
