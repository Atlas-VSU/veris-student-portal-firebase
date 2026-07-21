"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  GraduationCap,
  Pencil,
  ShieldCheck,
  Globe,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { SelfRegisterDialog } from "./components/SelfRegisterDialog";
import { UpdateInformationDialog } from "./components/UpdateInformationDialog";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selfRegisterOpen, setSelfRegisterOpen] = useState(false);
  const [updateInfoOpen, setUpdateInfoOpen] = useState(false);

  const handleMakePayment = () => {
    router.push("/payment");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans">
      {/* Background Organic Blurred Blobs */}
      <div className="absolute top-1/4 -left-32 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-3xl pointer-events-none blob-shape-1 animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-[35rem] h-[35rem] bg-secondary/10 rounded-full blur-3xl pointer-events-none blob-shape-2 animate-float-delayed" />

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
            onClick={() => setSelfRegisterOpen(true)}
            className="hover:text-secondary transition-colors cursor-pointer"
          >
            Self-Register
          </button>
          <button
            onClick={() => setUpdateInfoOpen(true)}
            className="hover:text-secondary transition-colors cursor-pointer"
          >
            Update Record
          </button>
          <Button
            onClick={handleMakePayment}
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
              setSelfRegisterOpen(true);
            }}
            className="text-left py-2 font-bold text-primary hover:text-secondary transition-colors cursor-pointer"
          >
            Self-Register
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setUpdateInfoOpen(true);
            }}
            className="text-left py-2 font-bold text-primary hover:text-secondary transition-colors cursor-pointer"
          >
            Update Record
          </button>
          <Button
            onClick={() => {
              setMobileMenuOpen(false);
              handleMakePayment();
            }}
            variant="secondary"
            className="w-full"
          >
            Pay Dues
          </Button>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 md:py-24 max-w-6xl mx-auto w-full text-center relative z-10">
        <div className="max-w-4xl space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-wider text-primary uppercase">
            <Globe className="size-3.5" />
            University Student Services Coalition
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black font-serif text-foreground leading-[1.1] tracking-tight">
            Manage your student dues and registration{" "}
            <span className="text-secondary font-serif block sm:inline">
              hassle-free.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
            Welcome to the VERIS Student Portal. Self-register, update your profile record, and pay organization fees or fines in a secure online platform.
          </p>
        </div>

        {/* Portal Feature Cards - Asymmetric Card Radii with micro-rotations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full mt-16 md:mt-24 text-left">
          {/* Card 1 — Self-Registration */}
          <div
            onClick={() => setSelfRegisterOpen(true)}
            className="bg-card border border-border/50 organic-card-1 p-8 shadow-soft hover:-translate-y-2 hover:rotate-1 hover:shadow-float cursor-pointer transition-all duration-500 flex flex-col h-full group"
          >
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground">
              <GraduationCap className="size-7" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-foreground mb-3">Student Self-Registration</h3>
            <p className="text-sm text-muted-foreground mb-8 flex-1 leading-relaxed">
              New students can easily register for organization membership online by verifying their email address.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-primary group-hover:text-secondary transition-colors duration-300">
              Register Now <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>

          {/* Card 2 — Update Record */}
          <div
            onClick={() => setUpdateInfoOpen(true)}
            className="bg-card border border-border/50 organic-card-2 p-8 shadow-soft hover:-translate-y-2 hover:-rotate-1 hover:shadow-float cursor-pointer transition-all duration-500 flex flex-col h-full group"
          >
            <div className="size-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-secondary group-hover:text-secondary-foreground">
              <Pencil className="size-7" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-foreground mb-3">Update Student Record</h3>
            <p className="text-sm text-muted-foreground mb-8 flex-1 leading-relaxed">
              Ensure your student information is accurate and up-to-date in order to receive correct clearance status.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-primary group-hover:text-secondary transition-colors duration-300">
              Update Record <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>

          {/* Card 3 — Pay Dues */}
          <div
            onClick={handleMakePayment}
            className="bg-card border border-border/50 organic-card-3 p-8 shadow-soft hover:-translate-y-2 hover:rotate-1 hover:shadow-float cursor-pointer transition-all duration-500 flex flex-col h-full group sm:col-span-2 lg:col-span-1"
          >
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground">
              <CreditCard className="size-7" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-foreground mb-3">Pay Dues &amp; Fines</h3>
            <p className="text-sm text-muted-foreground mb-8 flex-1 leading-relaxed">
              Verify your enrollment, review academic term dues or attendance fines, and securely submit GCash receipts.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-primary group-hover:text-secondary transition-colors duration-300">
              Settle Dues <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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

      {/* Dialog Modals */}
      <SelfRegisterDialog isOpen={selfRegisterOpen} onOpenChange={setSelfRegisterOpen} />
      <UpdateInformationDialog isOpen={updateInfoOpen} onOpenChange={setUpdateInfoOpen} />
    </div>
  );
}
