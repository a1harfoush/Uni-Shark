// /frontend/src/components/dashboard/EnhancedTimestampExample.tsx

"use client";

import { Card } from "@/components/ui/Card";
import { TimestampWithStaleness, StalenessIndicator, DataIntegrityIndicator } from "@/components/ui/StalenessIndicator";
import { useTimestampManager } from "@/lib/hooks/useTimestampManager";
import { useState } from "react";

/**
 * Example component demonstrating the enhanced timestamp management system
 * This shows how the new TimestampManager addresses the reliability requirements
 */
export default function EnhancedTimestampExample() {
  const [simulatedOperations, setSimulatedOperations] = useState(0);
  const [simulatedFailures, setSimulatedFailures] = useState(0);
  
  // Use the enhanced timestamp manager with persistence
  const {
    displayTime,
    stalenessInfo,
    isStale,
    updateTimestamp,
    getDisplayTime,
    actualUpdateTime,
    displayUpdateTime,
    failedOperationCount
  } = useTimestampManager({
    stalenessThreshold: 5, // 5 minutes for demo purposes
    autoRefreshInterval: 5000, // Refresh every 5 seconds
    persistKey: 'demo-timestamp-manager'
  });

  const handleSuccessfulOperation = () => {
    updateTimestamp(true);
    setSimulatedOperations(prev => prev + 1);
  };

  const handleFailedOperation = () => {
    updateTimestamp(false);
    setSimulatedOperations(prev => prev + 1);
    setSimulatedFailures(prev => prev + 1);
  };

  const successRate = simulatedOperations > 0 ? 
    ((simulatedOperations - simulatedFailures) / simulatedOperations) * 100 : 100;

  return (
    <Card className="p-6 space-y-6">
      <div className="border-b border-state-disabled/30 pb-4">
        <h3 className="font-heading text-lg text-accent-primary mb-2">
          // ENHANCED TIMESTAMP MANAGEMENT DEMO
        </h3>
        <p className="text-sm text-text-secondary">
          Demonstrating accurate timestamp tracking, staleness detection, and reliability indicators
        </p>
      </div>

      {/* Current Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="font-mono text-sm text-text-primary">TIMESTAMP STATUS</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Display Time:</span>
              <span className="font-mono text-text-primary">{displayTime}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Staleness:</span>
              <StalenessIndicator
                timestamp={actualUpdateTime}
                stalenessThreshold={5}
                showMessage={true}
                showIcon={true}
                size="sm"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Failed Operations:</span>
              <span className="font-mono text-state-error">{failedOperationCount}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-mono text-sm text-text-primary">DATA INTEGRITY</h4>
          
          <DataIntegrityIndicator
            successRate={successRate}
            totalOperations={simulatedOperations}
            failedOperations={simulatedFailures}
            showDetails={true}
          />
          
          <div className="text-xs text-text-secondary">
            Total Operations: {simulatedOperations}
          </div>
        </div>
      </div>

      {/* Detailed Timestamp Information */}
      <div className="bg-background-secondary/30 p-4 rounded border border-state-disabled/30">
        <h4 className="font-mono text-sm text-text-primary mb-3">DETAILED TIMESTAMP INFO</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <div className="text-text-secondary">Actual Update Time:</div>
            <div className="text-text-primary">
              {actualUpdateTime ? actualUpdateTime.toLocaleString() : 'Never updated'}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-text-secondary">Display Update Time:</div>
            <div className="text-text-primary">
              {displayUpdateTime ? displayUpdateTime.toLocaleString() : 'Never updated'}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-text-secondary">Staleness Message:</div>
            <div className={`${stalenessInfo.warningLevel === 'critical' ? 'text-state-error' : 
              stalenessInfo.warningLevel === 'warning' ? 'text-state-warning' : 'text-state-success'}`}>
              {stalenessInfo.message}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-text-secondary">Minutes Since Update:</div>
            <div className="text-text-primary">
              {stalenessInfo.minutesSinceUpdate === Infinity ? 'N/A' : stalenessInfo.minutesSinceUpdate}
            </div>
          </div>
        </div>
      </div>

      {/* Different Display Formats */}
      <div className="space-y-3">
        <h4 className="font-mono text-sm text-text-primary">DISPLAY FORMAT OPTIONS</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-background-secondary/20 rounded">
            <div className="text-text-secondary mb-1">Standard Format:</div>
            <div className="font-mono text-text-primary">
              {getDisplayTime({ useShortFormat: false })}
            </div>
          </div>
          
          <div className="p-3 bg-background-secondary/20 rounded">
            <div className="text-text-secondary mb-1">Short Format:</div>
            <div className="font-mono text-text-primary">
              {getDisplayTime({ useShortFormat: true })}
            </div>
          </div>
          
          <div className="p-3 bg-background-secondary/20 rounded">
            <div className="text-text-secondary mb-1">With Staleness Warning:</div>
            <div className="font-mono text-text-primary">
              {getDisplayTime({ includeStaleWarning: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="border-t border-state-disabled/30 pt-4">
        <h4 className="font-mono text-sm text-text-primary mb-3">SIMULATION CONTROLS</h4>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSuccessfulOperation}
            className="px-4 py-2 bg-state-success/20 text-state-success border border-state-success/30 rounded font-mono text-sm hover:bg-state-success/30 transition-colors"
          >
            SIMULATE SUCCESS
          </button>
          
          <button
            onClick={handleFailedOperation}
            className="px-4 py-2 bg-state-error/20 text-state-error border border-state-error/30 rounded font-mono text-sm hover:bg-state-error/30 transition-colors"
          >
            SIMULATE FAILURE
          </button>
        </div>
        
        <div className="mt-3 text-xs text-text-secondary">
          • Successful operations update both actual and display timestamps
          • Failed operations only increment failure count, display time remains unchanged
          • Staleness warnings appear when data exceeds the 5-minute threshold
          • Data integrity percentage reflects the success rate of operations
        </div>
      </div>

      {/* Requirements Compliance */}
      <div className="bg-accent-primary/10 p-4 rounded border border-accent-primary/30">
        <h4 className="font-mono text-sm text-accent-primary mb-3">REQUIREMENTS COMPLIANCE</h4>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-state-success">✓</span>
            <span className="text-text-secondary">
              <strong>Req 1.1:</strong> Shows actual time elapsed since last successful update
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-state-success">✓</span>
            <span className="text-text-secondary">
              <strong>Req 1.2:</strong> Timestamp doesn't update on failed operations
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-state-success">✓</span>
            <span className="text-text-secondary">
              <strong>Req 1.3:</strong> Only successful operations update timestamps
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-state-success">✓</span>
            <span className="text-text-secondary">
              <strong>Req 1.4:</strong> Time calculations based on actual data timestamps
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-state-success">✓</span>
            <span className="text-text-secondary">
              <strong>Req 1.5:</strong> Staleness warnings for outdated data
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}