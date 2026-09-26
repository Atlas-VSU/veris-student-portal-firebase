import { FeatureCardProps } from "../types/types";
import { ArrowRight } from "lucide-react";

export function FeatureCard({
  icon,
  title,
  description,
  footerText,
  colorClass,
  onClick,
}: FeatureCardProps) {
  // Extract classes carefully to handle tailwind opacity modifiers like bg-secondary/30
  const classes = colorClass.split(' ');
  const bgClassFull = classes[0];
  const fgClass = classes[1] || 'text-white';

  // Extract base color name for text coloring (e.g., bg-primary -> text-primary)
  const baseBgClass = bgClassFull.split('/')[0];
  const baseColor = baseBgClass.replace('bg-', '');
  const textClass = `text-${baseColor}`;

  return (
    <div
      className="relative group cursor-pointer w-full bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-border/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-400 flex flex-col mt-4 min-h-[150px]"
      onClick={onClick}
    >
      {/* Top Left Ribbon Tag with Fold Effect */}
      <div className={`absolute -top-3 left-6 md:left-6 w-16 h-30 ${baseBgClass} rounded-b-xl rounded-tr-md shadow-md flex items-center justify-center z-20 transition-transform duration-300 group-hover:-translate-y-1`}>
        {/* Darker Fold Corner pointing to the left */}
        <div className="absolute top-0 -left-3 w-0 h-0 border-t-[12px] border-t-black/20 border-l-[12px] border-l-transparent z-10 rounded-b" />

        {/* The Icon inside the tag */}
        <div className={`relative z-20 bg-white rounded-full size-10 flex items-center justify-center shadow-sm ${textClass} transition-transform duration-500 group-hover:scale-110`}>
          {icon}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pr-6 md:pr-8 pl-24 md:pl-28 pt-8 pb-10 flex flex-col justify-center">
        <h4 className={`text-sm md:text-lg font-bold uppercase tracking-widest mb-1.5 ${textClass} transition-transform duration-300 group-hover:-translate-x-1`}>
          {title}
        </h4>

        <div className="relative">
          {/* Standard Description */}
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium transition-all duration-300 group-hover:opacity-60">
            {description}
          </p>

          {/* Hover Action Text */}
          {footerText && (
            <div className="absolute bottom-[-20px] left-0 opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5 font-bold text-[10px] md:text-xs w-full">
              <span className={textClass}>
                {footerText}
              </span>
              <ArrowRight className={`size-3 md:size-3.5 ${textClass}`} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>

      {/* Thick Bottom Colored Bar */}
      <div className={`h-3.5 w-full ${baseBgClass} rounded-b-xl opacity-90`} />
    </div>
  );
}
