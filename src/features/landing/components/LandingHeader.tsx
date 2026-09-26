import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { LandingHeaderProps } from "../types/types";

export function LandingHeader({
  onSelfRegisterClick,
  onUpdateInfoClick,
  onPayDuesClick,
  mobileMenuOpen,
  setMobileMenuOpen,
}: LandingHeaderProps) {
  return (
    <>
      {/* Header - Sticky Floating Pill Navbar */}
      <header className="sticky top-4 z-40 max-w-5xl w-[calc(100%-2rem)] mx-auto bg-white/70 backdrop-blur-md border border-border/50 shadow-soft px-6 py-3 rounded-full flex items-center justify-between transition-all duration-300 mt-4">
        <div className="flex items-center gap-3">
          {/* Logo: Circular moss green container with white icon */}
          <div className="flex size-10 items-center justify-center rounded-full bg-primary p-2 border border-border/10 shadow-sm text-primary-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold font-serif leading-none tracking-wide text-foreground">
              VERIS
            </span>
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
              Student Portal
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-primary">
          <button
            onClick={onSelfRegisterClick}
            className="hover:text-secondary transition-colors cursor-pointer"
          >
            Self-Register
          </button>
          <button
            onClick={onUpdateInfoClick}
            className="hover:text-secondary transition-colors cursor-pointer"
          >
            Update Record
          </button>
          <Button
            onClick={onPayDuesClick}
            variant="secondary"
            size="sm"
          >
            Pay Dues
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-primary hover:bg-muted rounded-full transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>

      {/* Mobile Menu - Dropdown with organic rounded borders */}
      {mobileMenuOpen && (
        <div className="absolute top-24 left-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-border/50 p-6 space-y-4 flex flex-col shadow-float rounded-[2rem] animate-fade-in">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onSelfRegisterClick();
            }}
            className="text-left py-2 font-bold text-primary hover:text-secondary transition-colors cursor-pointer"
          >
            Self-Register
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onUpdateInfoClick();
            }}
            className="text-left py-2 font-bold text-primary hover:text-secondary transition-colors cursor-pointer"
          >
            Update Record
          </button>
          <Button
            onClick={() => {
              setMobileMenuOpen(false);
              onPayDuesClick();
            }}
            variant="secondary"
            className="w-full"
          >
            Pay Dues
          </Button>
        </div>
      )}
    </>
  );
}
