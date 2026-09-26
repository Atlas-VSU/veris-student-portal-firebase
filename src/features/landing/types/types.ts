export interface LandingHeaderProps {
  onSelfRegisterClick: () => void;
  onUpdateInfoClick: () => void;
  onPayDuesClick: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export interface LandingFeaturesProps {
  onSelfRegisterClick: () => void;
  onUpdateInfoClick: () => void;
  onPayDuesClick: () => void;
}

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  footerText: string;
  colorClass: string;
  onClick?: () => void;
}