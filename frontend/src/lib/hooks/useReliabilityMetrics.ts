// /frontend/src/lib/hooks/useReliabilityMetrics.ts

"use client";

import { useState, useEffect, useCallback } from 'react';

export interface ReliabilityMetrics {
  dataIntegrity: number;
  lastSuccessfulScrape: string | null;
  failedOperations: FailedOperation[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
  retryQueue: RetryOperation[];
  isStale: boolean;
  staleDuration: number; // minutes
  totalOperations: number;
  successfulOperations: number;
  recommendations: string[];
}

export interface FailedOperation {
  id: string;
  type: 'course_expansion' | 'data_fetch' | 'data_processing';
  timestamp: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
}

export interface RetryOperation {
  id: string;
  operation: FailedOperation;
  scheduledAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export function useReliabilityMetrics(localData: any) {
  const [metrics, setMetrics] = useState<ReliabilityMetrics>({
    dataIntegrity: 100,
    lastSuccessfulScrape: null,
    failedOperations: [],
    systemHealth: 'healthy',
    retryQueue: [],
    isStale: false,
    staleDuration: 0,
    totalOperations: 0,
    successfulOperations: 0,
    recommendations: []
  });

  const calculateMetrics = useCallback(() => {
    if (!localData) {
      setMetrics(prev => ({
        ...prev,
        dataIntegrity: 0,
        systemHealth: 'critical',
        recommendations: ['No data available. Please run a manual scan.']
      }));
      return;
    }

    // Get reliability data from enhanced local storage
    const reliability = localData.reliability || {};
    const monitoring = localData.monitoring || {};
    
    // Calculate data integrity
    const operationLog = monitoring.operationLog || [];
    const recentOperations = operationLog.filter((op: any) => {
      const opTime = new Date(op.timestamp);
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      return opTime > cutoff;
    });

    const totalOps = recentOperations.length || 1;
    const successfulOps = recentOperations.filter((op: any) => op.success).length;
    const integrityRate = (successfulOps / totalOps) * 100;

    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (integrityRate < 80) systemHealth = 'critical';
    else if (integrityRate < 95) systemHealth = 'degraded';

    // Check staleness
    const lastUpdate = localData.lastUpdated ? new Date(localData.lastUpdated) : null;
    const now = new Date();
    const staleDuration = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / 60000) : Infinity;
    const isStale = staleDuration > 15;

    // Generate recommendations
    const recommendations: string[] = [];
    if (integrityRate < 80) {
      recommendations.push('System integrity is below acceptable levels. Consider restarting the scraper service.');
    }
    if (isStale && staleDuration > 60) {
      recommendations.push('Data is significantly outdated. Run a manual scan to refresh.');
    }
    if (reliability.failedOperations?.length > 5) {
      recommendations.push('Multiple failures detected. Check network connectivity and authentication.');
    }
    if (systemHealth === 'critical') {
      recommendations.push('System is in critical state. Immediate attention required.');
    }

    setMetrics({
      dataIntegrity: integrityRate,
      lastSuccessfulScrape: reliability.lastSuccessfulScrape || localData.lastUpdated,
      failedOperations: reliability.failedOperations || [],
      systemHealth,
      retryQueue: reliability.retryQueue || [],
      isStale,
      staleDuration,
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      recommendations
    });
  }, [localData]);

  useEffect(() => {
    calculateMetrics();
    
    // Recalculate metrics every 30 seconds
    const interval = setInterval(calculateMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [calculateMetrics]);

  const refreshMetrics = useCallback(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  return {
    metrics,
    refreshMetrics,
    isHealthy: metrics.systemHealth === 'healthy',
    isDegraded: metrics.systemHealth === 'degraded',
    isCritical: metrics.systemHealth === 'critical',
    hasFailures: metrics.failedOperations.length > 0,
    needsAttention: metrics.systemHealth !== 'healthy' || metrics.isStale
  };
}

export function useSystemHealthStatus(localData: any) {
  const { metrics, isHealthy, isDegraded, isCritical } = useReliabilityMetrics(localData);
  
  const getHealthIcon = () => {
    if (isCritical) return '🔴';
    if (isDegraded) return '🟡';
    return '🟢';
  };

  const getHealthColor = () => {
    if (isCritical) return 'text-state-error';
    if (isDegraded) return 'text-state-warning';
    return 'text-state-success';
  };

  const getHealthMessage = () => {
    if (isCritical) return 'CRITICAL';
    if (isDegraded) return 'DEGRADED';
    return 'HEALTHY';
  };

  return {
    metrics,
    healthIcon: getHealthIcon(),
    healthColor: getHealthColor(),
    healthMessage: getHealthMessage(),
    isHealthy,
    isDegraded,
    isCritical
  };
}