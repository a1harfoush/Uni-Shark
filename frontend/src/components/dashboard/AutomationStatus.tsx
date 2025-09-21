// /frontend/src/components/dashboard/AutomationStatus.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { SystemHealthIndicator, ReliabilityBadge } from "@/components/ui/SystemHealthIndicator";
import { useSettings } from "@/lib/hooks/useSettings";
import { useReliabilityMetrics } from "@/lib/hooks/useReliabilityMetrics";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AutomationStatusProps {
  isScanning?: boolean;
  localData?: any;
}

export default function AutomationStatus({ isScanning, localData }: AutomationStatusProps) {
  const { settings, isLoading } = useSettings();
  const { needsAttention } = useReliabilityMetrics(localData);

  if (isLoading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-4 bg-background-secondary rounded w-3/4 mb-2"></div>
        <div className="h-6 bg-background-secondary rounded w-1/2"></div>
      </Card>
    );
  }

  const isActive = settings?.is_automation_active || false;
  const interval = settings?.check_interval_hours || 4;

  const getIntervalText = (hours: number) => {
    if (hours === 1) return "Every Hour";
    if (hours === 24) return "Daily";
    if (hours === 48) return "Every 2 Days";
    if (hours === 72) return "Every 3 Days";
    if (hours === 168) return "Weekly";
    return `Every ${hours}h`;
  };

  const getStatusColor = () => {
    if (!isActive) return "text-text-secondary";
    if (interval <= 2) return "text-accent-primary";
    if (interval <= 6) return "text-text-primary";
    return "text-text-secondary";
  };

  const getStatusIcon = () => {
    if (!isActive) return "⏸";
    if (isScanning) return "🔄";
    return "⚡";
  };

  return (
    <Card className={cn("p-4 relative overflow-hidden", isScanning && "animate-pulse")}>
      {/* Corner brackets */}
      <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-accent-primary opacity-50"></div>
      <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-accent-primary opacity-50"></div>
      <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-accent-primary opacity-50"></div>
      <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-accent-primary opacity-50"></div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-body text-base text-text-primary font-bold">
            {`// AUTOMATION_STATUS`}
          </h3>
          {localData && needsAttention && (
            <ReliabilityBadge localData={localData} className="text-xs" />
          )}
        </div>
        
        <Link 
          href="/settings" 
          className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono block mb-2"
        >
          [CONFIG]
        </Link>
        
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{getStatusIcon()}</span>
          <p className={cn("font-mono text-lg font-bold", getStatusColor())}
             style={{ textShadow: isActive ? '0 0 8px rgba(255, 255, 255, 0.3)' : 'none' }}>
            {isActive ? "ACTIVE" : "DISABLED"}
          </p>
        </div>
        
        {isActive && (
          <p className="font-mono text-xs text-text-secondary">
            {getIntervalText(interval)}
          </p>
        )}
        
        {/* System Health Indicator */}
        {localData && (
          <div className="mt-2 pt-2 border-t border-background-secondary/50">
            <SystemHealthIndicator 
              localData={localData} 
              size="sm" 
              showDetails={false}
            />
          </div>
        )}
      </div>
      
      {/* Status indicator bar */}
      <div className="mt-3 h-1 bg-background-secondary rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-1000",
            isActive ? "bg-accent-primary animate-pulse" : "bg-text-secondary",
            isScanning && "animate-ping"
          )}
          style={{ 
            width: isActive ? "100%" : "20%",
            boxShadow: isActive ? '0 0 8px rgba(137, 221, 255, 0.6)' : 'none'
          }}
        />
      </div>
    </Card>
  );
}