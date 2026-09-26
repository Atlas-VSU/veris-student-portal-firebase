import { ShieldCheck } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-10 px-4 sm:px-6 lg:px-8 mt-16 relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground font-medium select-none">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <span>&copy; {new Date().getFullYear()} VERIS. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6 text-muted-foreground">
          <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Support Helpdesk</span>
        </div>
      </div>
    </footer>
  );
}
