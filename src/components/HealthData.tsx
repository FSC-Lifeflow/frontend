import { AppleHealthData } from "@/components/AppleHealthData";
import { Activity } from "lucide-react";

interface HealthDataProps {
  className?: string;
}

export function HealthData({ className }: HealthDataProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Health Data (Terra)</h3>
        </div>
      </div>

      <AppleHealthData />
    </div>
  );
}

export default HealthData;
