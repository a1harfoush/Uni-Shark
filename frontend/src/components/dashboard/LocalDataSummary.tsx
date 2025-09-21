"use client";

import { Card } from "@/components/ui/Card";
import { TimestampWithStaleness, DataIntegrityIndicator } from "@/components/ui/StalenessIndicator";
import { FailureList, RecommendationsList } from "@/components/ui/SystemHealthIndicator";
import { useReliabilityMetrics } from "@/lib/hooks/useReliabilityMetrics";
import Link from "next/link";

interface LocalDataSummaryProps {
  localData: any;
}

export default function LocalDataSummary({ localData }: LocalDataSummaryProps) {
  const { metrics, needsAttention } = useReliabilityMetrics(localData);

  if (!localData) {
    return (
      <Card className="p-4 mb-6 border-state-error/50">
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">❌</span>
          <h3 className="font-heading text-lg text-state-error mb-2">// NO DATA AVAILABLE</h3>
          <p className="text-sm text-text-secondary mb-4">
            No local data found. Please run a manual scan to get started.
          </p>
          <Link 
            href="/settings" 
            className="text-xs text-accent-primary hover:underline font-mono"
          >
            [CONFIGURE SCANNING]
          </Link>
        </div>
      </Card>
    );
  }



  return (
    <Card className="p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-lg text-text-heading">// LOCAL DATA ARCHIVE</h3>
        <Link 
          href="/history" 
          className="text-xs text-accent-primary hover:underline"
        >
          VIEW FULL ARCHIVE
        </Link>
      </div>
      
      {/* Data Integrity Status */}
      {needsAttention && (
        <div className="mb-4 p-3 bg-background-secondary/30 rounded border border-state-warning/30">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-state-warning">// RELIABILITY STATUS</span>
            <DataIntegrityIndicator
              successRate={metrics.dataIntegrity}
              totalOperations={metrics.totalOperations}
              failedOperations={metrics.totalOperations - metrics.successfulOperations}
              showDetails={false}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FailureList localData={localData} maxItems={2} />
            <RecommendationsList localData={localData} maxItems={1} />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-background-secondary/50 rounded">
          <p className="font-mono text-xl text-accent-primary">{localData.courses?.length ?? 0}</p>
          <p className="text-xs text-text-secondary">Courses Tracked</p>
        </div>
        <div className="p-3 bg-background-secondary/50 rounded">
          <p className="font-mono text-xl text-accent-primary">{localData.quizzes?.length ?? 0}</p>
          <p className="text-xs text-text-secondary">Quizzes Found</p>
        </div>
        <div className="p-3 bg-background-secondary/50 rounded">
          <p className="font-mono text-xl text-accent-primary">{localData.assignments?.length ?? 0}</p>
          <p className="text-xs text-text-secondary">Assignments Found</p>
        </div>
      </div>

      {localData.lastUpdated && (
        <div className="mt-4">
          <div className="flex items-center justify-center mb-2">
            <span className="text-xs text-text-secondary mr-2">Last updated:</span>
            <TimestampWithStaleness
              timestamp={localData.lastUpdated}
              stalenessThreshold={15}
              useShortFormat={false}
            />
          </div>
          
          {/* Enhanced Status Information */}
          <div className="grid grid-cols-2 gap-4 mt-3 text-center">
            <div>
              <p className="text-xs text-text-secondary">
                Total scrapes: {localData.totalScrapes || 0}
              </p>
              {metrics.dataIntegrity < 100 && (
                <p className="text-xs text-state-warning mt-1">
                  Success rate: {metrics.dataIntegrity.toFixed(1)}%
                </p>
              )}
            </div>
            <div>
              {(localData.newQuizzesCount > 0 || localData.newAssignmentsCount > 0) && (
                <p className="text-xs text-state-success">
                  New items: {(localData.newQuizzesCount || 0) + (localData.newAssignmentsCount || 0)}
                </p>
              )}
              {metrics.isStale && (
                <p className="text-xs text-state-warning mt-1">
                  Data is {metrics.staleDuration}m old
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}