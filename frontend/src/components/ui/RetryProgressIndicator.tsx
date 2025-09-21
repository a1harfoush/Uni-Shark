/**
 * Enhanced Retry Progress Indicator Component
 * 
 * Shows visual progress of retry attempts with exponential backoff timing
 * and recovery status for individual operations.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// Simple Progress component replacement
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// Simple Badge component replacement
const Badge = ({ children, className, variant }: { 
  children: React.ReactNode; 
  className?: string; 
  variant?: string;
}) => (
  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
    variant === 'destructive' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
  } ${className}`}>
    {children}
  </span>
);

// Simple icon replacements (using text symbols instead of lucide-react)
const RefreshCw = ({ className }: { className?: string }) => <span className={className}>🔄</span>;
const Clock = ({ className }: { className?: string }) => <span className={className}>🕐</span>;
const AlertTriangle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
const CheckCircle = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const XCircle = ({ className }: { className?: string }) => <span className={className}>❌</span>;
const Pause = ({ className }: { className?: string }) => <span className={className}>⏸️</span>;
const Play = ({ className }: { className?: string }) => <span className={className}>▶️</span>;
import { useReliabilityMetrics } from "@/lib/hooks/useReliabilityMetrics";

// Simple cn utility replacement
const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');

// Simple RetryOperation type replacement
interface RetryOperation {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  timestamp: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Legacy component for backward compatibility
interface LegacyRetryProgressIndicatorProps {
  localData: any;
  className?: string;
  showLabel?: boolean;
}

export function LegacyRetryProgressIndicator({ 
  localData, 
  className, 
  showLabel = true 
}: LegacyRetryProgressIndicatorProps) {
  const { metrics } = useReliabilityMetrics(localData);

  if (!metrics.retryQueue.length) {
    return null;
  }

  const inProgressCount = metrics.retryQueue.filter(r => r.status === 'in_progress').length;
  const pendingCount = metrics.retryQueue.filter(r => r.status === 'pending').length;
  const totalRetries = metrics.retryQueue.length;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <span className="font-mono text-xs text-text-secondary">
          RETRYING:
        </span>
      )}
      
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalRetries, 5) }).map((_, index) => {
          const retry = metrics.retryQueue[index];
          const getStatusColor = () => {
            if (!retry) return 'bg-background-secondary';
            switch (retry.status) {
              case 'in_progress':
                return 'bg-state-warning animate-pulse';
              case 'completed':
                return 'bg-state-success';
              case 'failed':
                return 'bg-state-error';
              default:
                return 'bg-text-secondary';
            }
          };

          return (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                getStatusColor()
              )}
            />
          );
        })}
        
        {totalRetries > 5 && (
          <span className="font-mono text-xs text-text-secondary ml-1">
            +{totalRetries - 5}
          </span>
        )}
      </div>

      {showLabel && (
        <div className="font-mono text-xs text-text-secondary">
          {inProgressCount > 0 && (
            <span className="text-state-warning">{inProgressCount} active</span>
          )}
          {inProgressCount > 0 && pendingCount > 0 && <span>, </span>}
          {pendingCount > 0 && (
            <span>{pendingCount} pending</span>
          )}
        </div>
      )}
    </div>
  );
}

// Enhanced component for new retry system
interface RetryProgressIndicatorProps {
  operation: RetryOperation;
  onCancel?: (operationId: string) => void;
  onForceRetry?: (operationId: string) => void;
  className?: string;
  showDetails?: boolean;
}

export function RetryProgressIndicator({
  operation,
  onCancel,
  onForceRetry,
  className = '',
  showDetails = true
}: RetryProgressIndicatorProps) {
  const [timeUntilRetry, setTimeUntilRetry] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const retryTime = new Date(operation.nextRetryAt).getTime();
      const remaining = Math.max(0, retryTime - now);
      
      setTimeUntilRetry(remaining);
      
      if (remaining === 0 && operation.retryCount < operation.maxRetries) {
        setIsActive(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [operation.nextRetryAt, operation.retryCount, operation.maxRetries]);

  const getProgressPercentage = (): number => {
    return (operation.retryCount / operation.maxRetries) * 100;
  };

  const getStatusIcon = () => {
    if (operation.retryCount >= operation.maxRetries) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    if (timeUntilRetry > 0) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    
    if (isActive) {
      return <RefreshCw className="h-4 w-4 text-orange-500 animate-spin-slow" />;
    }
    
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = (): string => {
    if (operation.retryCount >= operation.maxRetries) {
      return 'Max retries reached';
    }
    
    if (timeUntilRetry > 0) {
      const seconds = Math.ceil(timeUntilRetry / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes > 0) {
        return `Retry in ${minutes}m ${remainingSeconds}s`;
      }
      return `Retry in ${seconds}s`;
    }
    
    if (isActive) {
      return 'Retrying now...';
    }
    
    return 'Ready to retry';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatOperationType = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{operation.id}</span>
          <Badge className={getPriorityColor(operation.priority)}>
            {operation.priority}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {onForceRetry && timeUntilRetry > 0 && (
            <Button
              variant="secondary"
              onClick={() => onForceRetry(operation.id)}
              disabled={operation.retryCount >= operation.maxRetries}
              className="text-xs px-2 py-1"
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
          
          {onCancel && (
            <Button
              variant="secondary"
              onClick={() => onCancel(operation.id)}
              className="text-xs px-2 py-1"
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Attempt {operation.retryCount} of {operation.maxRetries}
          </span>
          <span className="text-gray-600">{getStatusText()}</span>
        </div>
        
        <Progress 
          value={getProgressPercentage()} 
          className="h-2"
        />
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2">{formatOperationType(operation.type)}</span>
            </div>
            <div>
              <span className="text-gray-600">Started:</span>
              <span className="ml-2">{formatTimestamp(operation.timestamp)}</span>
            </div>
          </div>
          
          {operation.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
              <div className="font-medium text-red-800 mb-1">Last Error:</div>
              <div className="text-red-700">{operation.error}</div>
            </div>
          )}
          
          {operation.metadata && Object.keys(operation.metadata).length > 0 && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
              <div className="font-medium text-gray-800 mb-1">Metadata:</div>
              <div className="space-y-1">
                {Object.entries(operation.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Footer */}
      <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
        <span>Next retry: {new Date(operation.nextRetryAt).toLocaleTimeString()}</span>
        {operation.retryCount >= operation.maxRetries && (
          <Badge className="text-xs bg-red-100 text-red-800">
            Failed
          </Badge>
        )}
      </div>
    </div>
  );
}

interface OperationStatusBadgeProps {
  operation: {
    type: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    retryCount?: number;
    maxRetries?: number;
  };
  className?: string;
}

export function OperationStatusBadge({ operation, className }: OperationStatusBadgeProps) {
  const getStatusColor = () => {
    switch (operation.status) {
      case 'in_progress':
        return 'text-state-warning border-state-warning';
      case 'completed':
        return 'text-state-success border-state-success';
      case 'failed':
        return 'text-state-error border-state-error';
      default:
        return 'text-text-secondary border-text-secondary';
    }
  };

  const getStatusIcon = () => {
    switch (operation.status) {
      case 'in_progress':
        return '⏳';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏸️';
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono",
      getStatusColor(),
      className
    )}>
      <span>{getStatusIcon()}</span>
      <span>{operation.type.replace('_', ' ').toUpperCase()}</span>
      {operation.retryCount !== undefined && operation.maxRetries !== undefined && (
        <span className="opacity-70">
          ({operation.retryCount}/{operation.maxRetries})
        </span>
      )}
    </div>
  );
}