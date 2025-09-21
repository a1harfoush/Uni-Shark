"use client";

import React from 'react';
import { DashboardErrorBoundary, ErrorFallbackProps } from './DashboardErrorBoundary';

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  section: string;
  fallbackHeight?: string;
  enableRecovery?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Lightweight fallback for section-specific errors
const SectionErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onRestore,
  isRecovering,
  section
}) => {
  return (
    <div className="border border-red-400/30 bg-red-400/10 rounded-lg p-4 text-red-400">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">
            {section} Section Error
          </h4>
          <p className="text-xs opacity-80">
            {error?.message || 'Component failed to render'}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          disabled={isRecovering}
          className="px-3 py-1 text-xs bg-red-400 text-background rounded hover:bg-red-400/80 disabled:opacity-50 transition-colors"
        >
          {isRecovering ? 'Fixing...' : 'Retry'}
        </button>
        
        <button
          onClick={onRestore}
          disabled={isRecovering}
          className="px-3 py-1 text-xs border border-red-400 rounded hover:bg-red-400/10 disabled:opacity-50 transition-colors"
        >
          Restore
        </button>
      </div>
    </div>
  );
};

export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({
  children,
  section,
  fallbackHeight = 'auto',
  enableRecovery = true,
  onError
}) => {
  return (
    <div style={{ minHeight: fallbackHeight }}>
      <DashboardErrorBoundary
        section={section}
        fallback={SectionErrorFallback}
        enableRecovery={enableRecovery}
        onError={onError}
      >
        {children}
      </DashboardErrorBoundary>
    </div>
  );
};

// Specific error boundaries for common dashboard sections
export const KPIErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary section="KPI Cards" fallbackHeight="120px">
    {children}
  </SectionErrorBoundary>
);

export const NotificationErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary section="Notifications" fallbackHeight="200px">
    {children}
  </SectionErrorBoundary>
);

export const TargetsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary section="Upcoming Targets" fallbackHeight="200px">
    {children}
  </SectionErrorBoundary>
);

export const AbsenceErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary section="Absence Tracker" fallbackHeight="200px">
    {children}
  </SectionErrorBoundary>
);

export const ArchiveErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary section="Data Archive" fallbackHeight="150px">
    {children}
  </SectionErrorBoundary>
);

export const ScanErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary section="Scan Operations" fallbackHeight="100px">
    {children}
  </SectionErrorBoundary>
);