import { UserPlus, Pencil, CreditCard } from "lucide-react";
import { LandingFeaturesProps } from "../types/types";
import { FeatureCard } from "./FeatureCard";

export function LandingFeatures({
  onSelfRegisterClick,
  onUpdateInfoClick,
  onPayDuesClick,
}: LandingFeaturesProps) {
  return (
    <div className="w-full max-w-[85rem] mx-auto flex flex-col gap-6 md:mt-10">
      <h3 className="text-primary font-bold text-lg md:text-xl px-4 md:px-0 text-center md:text-left">
        What would you like to do?
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4 md:px-0 mt-2">
        {/* Card 1 — Self-Registration */}
        <FeatureCard
          icon={<UserPlus className="size-5" />}
          title="Self-Registration"
          description="New students can register their information for organizational clearance."
          footerText="Click to Register Now"
          colorClass="bg-primary"
          onClick={onSelfRegisterClick}
        />

        {/* Card 2 — Update Record */}
        <FeatureCard
          icon={<Pencil className="size-5" />}
          title="Update Record"
          description="Update student information to ensure accurate information for organizational clearance."
          footerText="Click to Update Record"
          colorClass="bg-primary"
          onClick={onUpdateInfoClick}
        />

        {/* Card 3 — Pay Dues */}
        <FeatureCard
          icon={<CreditCard className="size-5" />}
          title="Pay Fines"
          description="Review and pay your organizational fines and securely pay."
          footerText="Click to Settle Balances"
          colorClass="bg-primary"
          onClick={onPayDuesClick}
        />
      </div>
    </div>
  );
}

