"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, Database, Info, Zap } from 'lucide-react';
import { ErrorFallbackProps } from './DashboardErrorBoundary';

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onRestore,
  isRecovering,
  recoveryAttempts,
  section = 'Unknown'
}) => {
  const getErrorSeverity = (error: Error | null): 'low' | 'medium' | 'high' => {
    if (!error) return 'low';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) return 'medium';
    if (message.includes('storage') || message.includes('data')) return 'high';
    if (message.includes('render') || message.includes('component')) return 'medium';
    
    return 'low';
  };

  const getErrorRecommendations = (error: Error | null): string[] => {
    if (!error) return ['Try refreshing the page'];
    
    const message = error.message.toLowerCase();
    const recommendations: string[] = [];
    
    if (message.includes('network')) {
      recommendations.push('Check your internet connection');
      recommendations.push('Try again in a few moments');
    }
    
    if (message.includes('storage') || message.includes('quota')) {
      recommendations.push('Clear browser storage and cache');
      recommendations.push('Free up disk space');
    }
    
    if (message.includes('data') || message.includes('parse')) {
      recommendations.push('Restore from backup data');
      recommendations.push('Reset to default settings');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Try refreshing the page');
      recommendations.push('Contact support if the issue persists');
    }
    
    return recommendations;
  };

  const severity = getErrorSeverity(error);
  const recommendations = getErrorRecommendations(error);
  
  const severityColors = {
    low: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    medium: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    high: 'text-red-400 border-red-400/30 bg-red-400/10'
  };

  const severityIcons = {
    low: Info,
    medium: AlertTriangle,
    high: Zap
  };

  const SeverityIcon = severityIcons[severity];

  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <div className={`max-w-md w-full border rounded-lg p-6 ${severityColors[severity]}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <SeverityIcon className="w-6 h-6" />
          <div>
            <h3 className="font-heading text-lg">
              System Error Detected
            </h3>
            <p className="text-sm opacity-80">
              Section: {section.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Error Details */}
        <div className="mb-4 space-y-2">
          <div className="text-sm">
            <strong>Error:</strong> {error?.message || 'Unknown error occurred'}
          </div>
          
          {recoveryAttempts > 0 && (
            <div className="text-sm opacity-80">
              Recovery attempts: {recoveryAttempts}/3
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2">Recommended Actions:</h4>
          <ul className="text-sm space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-accent-primary mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onRetry}
            disabled={isRecovering}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-primary text-background rounded hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRecovering ? 'animate-spin-slow' : ''}`} />
            {isRecovering ? 'Recovering...' : 'Retry'}
          </button>
          
          <button
            onClick={onRestore}
            disabled={isRecovering}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-current rounded hover:bg-current/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Database className="w-4 h-4" />
            Restore Backup
          </button>
        </div>

        {/* Technical Details (Collapsible) */}
        <details className="mt-4">
          <summary className="text-sm cursor-pointer hover:opacity-80">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-background/20 rounded text-xs font-mono">
            <div className="mb-2">
              <strong>Stack:</strong>
              <pre className="mt-1 whitespace-pre-wrap break-all">
                {error?.stack || 'No stack trace available'}
              </pre>
            </div>
            
            {errorInfo?.componentStack && (
              <div>
                <strong>Component Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap break-all">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};