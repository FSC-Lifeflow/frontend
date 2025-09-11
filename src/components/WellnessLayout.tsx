import { ReactNode } from "react";

interface WellnessLayoutProps {
  children: ReactNode;
}

export function WellnessLayout({ children }: WellnessLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-wellness">
      <div className="relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,hsl(var(--secondary))_0%,transparent_50%)] opacity-10" />
        </div>
        
        {/* Main content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}