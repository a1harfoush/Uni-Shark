// /frontend/src/components/ui/StalenessIndicator.tsx

"use client";

import { useStalenessMonitor } from "@/lib/hooks/useTimestampManager";
import { cn } from "@/lib/utils";

interface StalenessIndicatorProps {
  timestamp: Date | string | null;
  stalenessThreshold?: number;
  showMessage?: boolean;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StalenessIndicator({
  timestamp,
  stalenessThreshold = 15,
  showMessage = false,
  showIcon = true,
  className,
  size = 'md'
}: StalenessIndicatorProps) {
  const stalenessInfo = useStalenessMonitor(timestamp, stalenessThreshold);

  const getIndicatorColor = () => {
    switch (stalenessInfo.warningLevel) {
      case 'critical':
        return 'text-state-error';
      case 'warning':
        return 'text-state-warning';
      default:
        return 'text-state-success';
    }
  };

  const getIndicatorIcon = () => {
    switch (stalenessInfo.warningLevel) {
      case 'critical':
        return '⚠️';
      case 'warning':
        return '⚡';
      default:
        return '✅';
    }
  };

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

  if (!timestamp) {
    return (
      <div className={cn("flex items-center gap-1", getSizeClasses(), className)}>
        {showIcon && <span>❌</span>}
        {showMessage && <span className="text-state-error">No data</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", getSizeClasses(), getIndicatorColor(), className)}>
      {showIcon && <span>{getIndicatorIcon()}</span>}
      {showMessage && (
        <span className="font-mono">
          {stalenessInfo.warningLevel === 'none' ? 'CURRENT' : stalenessInfo.warningLevel.toUpperCase()}
        </span>
      )}
    </div>
  );
}

interface TimestampWithStalenessProps {
  timestamp: Date | string | null;
  stalenessThreshold?: number;
  showSeconds?: boolean;
  useShortFormat?: boolean;
  className?: string;
}

export function TimestampWithStaleness({
  timestamp,
  stalenessThreshold = 15,
  showSeconds = false,
  useShortFormat = false,
  className
}: TimestampWithStalenessProps) {
  const stalenessInfo = useStalenessMonitor(timestamp, stalenessThreshold);

  const formatTimestamp = () => {
    if (!timestamp) return 'Never updated';

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (useShortFormat) {
      if (diffMinutes < 1) return 'NOW';
      if (diffMinutes < 60) return `${diffMinutes}M`;
      if (diffHours < 24) return `${diffHours}H`;
      return `${diffDays}D`;
    }

    if (diffMinutes < 1) {
      return showSeconds ? `${Math.floor(diffMs / 1000)}s ago` : 'LESS_THAN A MINUTE';
    }
    if (diffMinutes < 60) return `${diffMinutes} MINUTE${diffMinutes === 1 ? '' : 'S'} AGO`;
    if (diffHours < 24) return `${diffHours} HOUR${diffHours === 1 ? '' : 'S'} AGO`;
    return `${diffDays} DAY${diffDays === 1 ? '' : 'S'} AGO`;
  };

  const getTextColor = () => {
    switch (stalenessInfo.warningLevel) {
      case 'critical':
        return 'text-state-error';
      case 'warning':
        return 'text-state-warning';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("font-mono text-xs", getTextColor())}>
        {formatTimestamp()}
      </span>
      <StalenessIndicator
        timestamp={timestamp}
        stalenessThreshold={stalenessThreshold}
        showIcon={true}
        showMessage={false}
        size="sm"
      />
    </div>
  );
}

interface DataIntegrityIndicatorProps {
  successRate: number;
  totalOperations: number;
  failedOperations: number;
  className?: string;
  showDetails?: boolean;
}

export function DataIntegrityIndicator({
  successRate,
  totalOperations,
  failedOperations,
  className,
  showDetails = false
}: DataIntegrityIndicatorProps) {
  const getIntegrityColor = () => {
    if (successRate >= 95) return 'text-state-success';
    if (successRate >= 80) return 'text-state-warning';
    return 'text-state-error';
  };

  const getIntegrityIcon = () => {
    if (successRate >= 95) return '🟢';
    if (successRate >= 80) return '🟡';
    return '🔴';
  };

  const getIntegrityStatus = () => {
    if (successRate >= 95) return 'HEALTHY';
    if (successRate >= 80) return 'DEGRADED';
    return 'CRITICAL';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span>{getIntegrityIcon()}</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-sm font-bold", getIntegrityColor())}>
            {successRate.toFixed(1)}%
          </span>
          <span className={cn("font-mono text-xs", getIntegrityColor())}>
            {getIntegrityStatus()}
          </span>
        </div>
        {showDetails && (
          <span className="font-mono text-xs text-text-secondary">
            {totalOperations - failedOperations}/{totalOperations} successful
          </span>
        )}
      </div>
    </div>
  );
}