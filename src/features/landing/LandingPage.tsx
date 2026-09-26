"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelfRegisterDialog } from "./components/SelfRegisterDialog";
import { UpdateInformationDialog } from "./components/UpdateInformationDialog";
import { LandingHeader } from "./components/LandingHeader";
import { LandingHero } from "./components/LandingHero";
import { LandingFeatures } from "./components/LandingFeatures";
import { LandingFooter } from "./components/LandingFooter";

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
      <LandingHeader
        onSelfRegisterClick={() => setSelfRegisterOpen(true)}
        onUpdateInfoClick={() => setUpdateInfoOpen(true)}
        onPayDuesClick={handleMakePayment}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="flex-1 flex flex-col items-center justify-center gap-16 px-4 py-16 md:py-24 max-w-7xl mx-auto w-full relative z-10">
        <LandingHero />
        <LandingFeatures
          onSelfRegisterClick={() => setSelfRegisterOpen(true)}
          onUpdateInfoClick={() => setUpdateInfoOpen(true)}
          onPayDuesClick={handleMakePayment}
        />
      </main>

      <LandingFooter />

      {/* Dialog Modals */}
      <SelfRegisterDialog isOpen={selfRegisterOpen} onOpenChange={setSelfRegisterOpen} />
      <UpdateInformationDialog isOpen={updateInfoOpen} onOpenChange={setUpdateInfoOpen} />
    </div>
  );
}
