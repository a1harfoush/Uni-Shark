// /frontend/src/components/dashboard/ReliabilityStatusCard.tsx

"use client";

import { Card } from "@/components/ui/Card";
import { SystemHealthIndicator, FailureList, RecommendationsList } from "@/components/ui/SystemHealthIndicator";
import { DataIntegrityIndicator, TimestampWithStaleness } from "@/components/ui/StalenessIndicator";
import { useReliabilityMetrics } from "@/lib/hooks/useReliabilityMetrics";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ReliabilityStatusCardProps {
  localData: any;
  isScanning?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ReliabilityStatusCard({ 
  localData, 
  isScanning = false, 
  showDetails = true,
  className 
}: ReliabilityStatusCardProps) {
  const { metrics, isHealthy, isDegraded, isCritical, needsAttention } = useReliabilityMetrics(localData);

  if (!localData) {
    return (
      <Card className={cn("p-4 border-state-error/50", className)}>
        <div className="text-center py-6">
          <span className="text-3xl mb-3 block">⚠️</span>
          <h3 className="font-heading text-lg text-state-error mb-2">// SYSTEM OFFLINE</h3>
          <p className="text-sm text-text-secondary mb-4">
            No reliability data available. System may be offline or not configured.
          </p>
          <Link 
            href="/settings" 
            className="text-xs text-accent-primary hover:underline font-mono"
          >
            [CONFIGURE SYSTEM]
          </Link>
        </div>
      </Card>
    );
  }

  const getCardBorderColor = () => {
    if (isCritical) return "border-state-error/50";
    if (isDegraded) return "border-state-warning/50";
    return "border-accent-primary/20";
  };

  const getHeaderColor = () => {
    if (isCritical) return "text-state-error";
    if (isDegraded) return "text-state-warning";
    return "text-accent-primary";
  };

  return (
    <Card className={cn(
      "p-4 relative overflow-hidden",
      getCardBorderColor(),
      isScanning && "animate-pulse",
      className
    )}>
      {/* Corner brackets with dynamic color */}
      <div className={cn(
        "absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 opacity-50",
        isCritical ? "border-state-error" : isDegraded ? "border-state-warning" : "border-accent-primary"
      )}></div>
      <div className={cn(
        "absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 opacity-50",
        isCritical ? "border-state-error" : isDegraded ? "border-state-warning" : "border-accent-primary"
      )}></div>
      <div className={cn(
        "absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 opacity-50",
        isCritical ? "border-state-error" : isDegraded ? "border-state-warning" : "border-accent-primary"
      )}></div>
      <div className={cn(
        "absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 opacity-50",
        isCritical ? "border-state-error" : isDegraded ? "border-state-warning" : "border-accent-primary"
      )}></div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={cn("font-heading text-lg font-bold", getHeaderColor())}>
          // SYSTEM_RELIABILITY
        </h3>
        <Link 
          href="/history" 
          className="text-xs text-accent-primary hover:underline font-mono"
        >
          [VIEW LOGS]
        </Link>
      </div>

      {/* Main Status Display */}
      <div className="flex items-center justify-between mb-4">
        <SystemHealthIndicator 
          localData={localData} 
          showDetails={false} 
          size="lg"
        />
        <DataIntegrityIndicator
          successRate={metrics.dataIntegrity}
          totalOperations={metrics.totalOperations}
          failedOperations={metrics.totalOperations - metrics.successfulOperations}
          showDetails={true}
        />
      </div>

      {/* Last Update Status */}
      {metrics.lastSuccessfulScrape && (
        <div className="mb-4 p-3 bg-background-secondary/30 rounded">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary">LAST SUCCESSFUL SCAN:</span>
            <TimestampWithStaleness
              timestamp={metrics.lastSuccessfulScrape}
              stalenessThreshold={15}
              useShortFormat={false}
            />
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && needsAttention && (
        <div className="space-y-4">
          {/* Failure Information */}
          {metrics.failedOperations.length > 0 && (
            <div className="p-3 bg-background-secondary/20 rounded border border-state-error/20">
              <FailureList localData={localData} maxItems={3} />
            </div>
          )}

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <div className="p-3 bg-background-secondary/20 rounded border border-accent-primary/20">
              <RecommendationsList localData={localData} maxItems={3} />
            </div>
          )}

          {/* Retry Queue Status */}
          {metrics.retryQueue.length > 0 && (
            <div className="p-3 bg-background-secondary/20 rounded border border-state-warning/20">
              <h4 className="font-mono text-xs text-state-warning uppercase mb-2">
                Retry Queue ({metrics.retryQueue.length}):
              </h4>
              <div className="space-y-1">
                {metrics.retryQueue.slice(0, 2).map((retry, index) => (
                  <div key={retry.id || index} className="flex items-center gap-2 text-xs">
                    <span className="text-state-warning">⏳</span>
                    <span className="font-mono text-text-secondary">
                      {retry.operation.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-text-secondary">
                      {retry.status.toUpperCase()}
                    </span>
                  </div>
                ))}
                {metrics.retryQueue.length > 2 && (
                  <div className="text-xs text-text-secondary font-mono">
                    +{metrics.retryQueue.length - 2} more pending
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status indicator bar */}
      <div className="mt-4 h-2 bg-background-secondary rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-1000",
            isHealthy ? "bg-state-success" : isDegraded ? "bg-state-warning" : "bg-state-error",
            isScanning && "animate-pulse"
          )}
          style={{ 
            width: `${metrics.dataIntegrity}%`,
            boxShadow: isHealthy ? '0 0 8px rgba(34, 197, 94, 0.6)' : 
                      isDegraded ? '0 0 8px rgba(251, 191, 36, 0.6)' : 
                      '0 0 8px rgba(239, 68, 68, 0.6)'
          }}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="p-2 bg-background-secondary/30 rounded">
          <p className="font-mono text-sm text-accent-primary">{metrics.totalOperations}</p>
          <p className="text-xs text-text-secondary">Total Ops</p>
        </div>
        <div className="p-2 bg-background-secondary/30 rounded">
          <p className="font-mono text-sm text-accent-primary">{metrics.successfulOperations}</p>
          <p className="text-xs text-text-secondary">Successful</p>
        </div>
        <div className="p-2 bg-background-secondary/30 rounded">
          <p className="font-mono text-sm text-accent-primary">{metrics.staleDuration}m</p>
          <p className="text-xs text-text-secondary">Data Age</p>
        </div>
      </div>
    </Card>
  );
}