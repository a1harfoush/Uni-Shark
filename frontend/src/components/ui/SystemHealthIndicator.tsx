// /frontend/src/components/ui/SystemHealthIndicator.tsx

"use client";

import { useSystemHealthStatus } from "@/lib/hooks/useReliabilityMetrics";
import { DataIntegrityIndicator } from "./StalenessIndicator";
import { cn } from "@/lib/utils";

interface SystemHealthIndicatorProps {
  localData: any;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SystemHealthIndicator({
  localData,
  showDetails = false,
  size = 'md',
  className
}: SystemHealthIndicatorProps) {
  const { 
    metrics, 
    healthIcon, 
    healthColor, 
    healthMessage, 
    isCritical, 
    isDegraded 
  } = useSystemHealthStatus(localData);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  if (!localData) {
    return (
      <div className={cn("flex items-center gap-2", getSizeClasses(), className)}>
        <span>❌</span>
        <span className="font-mono text-state-error">NO DATA</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", getSizeClasses(), className)}>
      <span>{healthIcon}</span>
      <div className="flex flex-col">
        <span className={cn("font-mono font-bold", healthColor, getSizeClasses())}>
          {healthMessage}
        </span>
        {showDetails && (
          <div className="flex flex-col gap-1 mt-1">
            <DataIntegrityIndicator
              successRate={metrics.dataIntegrity}
              totalOperations={metrics.totalOperations}
              failedOperations={metrics.totalOperations - metrics.successfulOperations}
              showDetails={true}
              className="text-xs"
            />
            {metrics.isStale && (
              <span className="font-mono text-xs text-state-warning">
                Data is {metrics.staleDuration}m old
              </span>
            )}
            {metrics.failedOperations.length > 0 && (
              <span className="font-mono text-xs text-state-error">
                {metrics.failedOperations.length} failed operations
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ReliabilityBadgeProps {
  localData: any;
  className?: string;
}

export function ReliabilityBadge({ localData, className }: ReliabilityBadgeProps) {
  const { metrics, healthColor, isCritical, isDegraded } = useSystemHealthStatus(localData);

  if (!localData || (!isCritical && !isDegraded)) {
    return null;
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono",
      "border border-current opacity-80",
      healthColor,
      className
    )}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
      <span>
        {isCritical ? 'CRITICAL' : 'DEGRADED'} - {metrics.dataIntegrity.toFixed(0)}%
      </span>
    </div>
  );
}

interface FailureListProps {
  localData: any;
  maxItems?: number;
  className?: string;
}

export function FailureList({ localData, maxItems = 3, className }: FailureListProps) {
  const { metrics } = useSystemHealthStatus(localData);

  if (!metrics.failedOperations.length) {
    return null;
  }

  const displayFailures = metrics.failedOperations.slice(0, maxItems);

  return (
    <div className={cn("space-y-1", className)}>
      <h4 className="font-mono text-xs text-text-secondary uppercase">Recent Failures:</h4>
      {displayFailures.map((failure, index) => (
        <div key={failure.id || index} className="flex items-center gap-2 text-xs">
          <span className="text-state-error">⚠</span>
          <span className="font-mono text-text-secondary truncate">
            {failure.type.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-text-secondary text-xs">
            {new Date(failure.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
      {metrics.failedOperations.length > maxItems && (
        <div className="text-xs text-text-secondary font-mono">
          +{metrics.failedOperations.length - maxItems} more failures
        </div>
      )}
    </div>
  );
}

interface RecommendationsListProps {
  localData: any;
  maxItems?: number;
  className?: string;
}

export function RecommendationsList({ localData, maxItems = 2, className }: RecommendationsListProps) {
  const { metrics } = useSystemHealthStatus(localData);

  if (!metrics.recommendations.length) {
    return null;
  }

  const displayRecommendations = metrics.recommendations.slice(0, maxItems);

  return (
    <div className={cn("space-y-1", className)}>
      <h4 className="font-mono text-xs text-accent-primary uppercase">Recommendations:</h4>
      {displayRecommendations.map((recommendation, index) => (
        <div key={index} className="flex items-start gap-2 text-xs">
          <span className="text-accent-primary mt-0.5">→</span>
          <span className="text-text-secondary leading-tight">
            {recommendation}
          </span>
        </div>
      ))}
    </div>
  );
}