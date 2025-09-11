import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WellnessCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "glow";
}

export function WellnessCard({ children, className, variant = "default" }: WellnessCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-6 transition-all duration-300",
        {
          "bg-card shadow-card border border-border/50": variant === "default",
          "bg-card/80 backdrop-blur-sm shadow-wellness border border-white/20": variant === "glass",
          "bg-card shadow-glow border border-primary/20 animate-glow-pulse": variant === "glow",
        },
        className
      )}
    >
      {children}
    </div>
  );
}