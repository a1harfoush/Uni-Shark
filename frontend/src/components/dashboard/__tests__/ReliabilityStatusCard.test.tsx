// /frontend/src/components/dashboard/__tests__/ReliabilityStatusCard.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReliabilityStatusCard from '../ReliabilityStatusCard';

// Mock the hooks
jest.mock('@/lib/hooks/useReliabilityMetrics', () => ({
  useReliabilityMetrics: jest.fn()
}));

const mockUseReliabilityMetrics = require('@/lib/hooks/useReliabilityMetrics').useReliabilityMetrics;

describe('ReliabilityStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders offline state when no local data is provided', () => {
    mockUseReliabilityMetrics.mockReturnValue({
      metrics: {
        dataIntegrity: 0,
        lastSuccessfulScrape: null,
        failedOperations: [],
        systemHealth: 'critical',
        retryQueue: [],
        isStale: true,
        staleDuration: 0,
        totalOperations: 0,
        successfulOperations: 0,
        recommendations: []
      },
      isHealthy: false,
      isDegraded: false,
      isCritical: true,
      needsAttention: true
    });

    render(<ReliabilityStatusCard localData={null} />);
    
    expect(screen.getByText('// SYSTEM OFFLINE')).toBeInTheDocument();
    expect(screen.getByText('No reliability data available. System may be offline or not configured.')).toBeInTheDocument();
    expect(screen.getByText('[CONFIGURE SYSTEM]')).toBeInTheDocument();
  });

  it('renders healthy system status correctly', () => {
    const mockLocalData = {
      lastUpdated: new Date().toISOString(),
      totalScrapes: 10,
      courses: ['course1', 'course2'],
      reliability: {
        dataIntegrity: 98.5,
        systemHealth: 'healthy',
        failedOperations: [],
        retryQueue: []
      }
    };

    mockUseReliabilityMetrics.mockReturnValue({
      metrics: {
        dataIntegrity: 98.5,
        lastSuccessfulScrape: mockLocalData.lastUpdated,
        failedOperations: [],
        systemHealth: 'healthy',
        retryQueue: [],
        isStale: false,
        staleDuration: 5,
        totalOperations: 20,
        successfulOperations: 19,
        recommendations: []
      },
      isHealthy: true,
      isDegraded: false,
      isCritical: false,
      needsAttention: false
    });

    render(<ReliabilityStatusCard localData={mockLocalData} />);
    
    expect(screen.getByText('// SYSTEM_RELIABILITY')).toBeInTheDocument();
    expect(screen.getByText('[VIEW LOGS]')).toBeInTheDocument();
    expect(screen.getByText('LAST SUCCESSFUL SCAN:')).toBeInTheDocument();
  });

  it('renders degraded system status with warnings', () => {
    const mockLocalData = {
      lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      reliability: {
        dataIntegrity: 85,
        systemHealth: 'degraded',
        failedOperations: [
          {
            id: '1',
            type: 'course_expansion',
            timestamp: new Date().toISOString(),
            error: 'Failed to expand course',
            retryCount: 2,
            maxRetries: 3
          }
        ],
        retryQueue: []
      }
    };

    mockUseReliabilityMetrics.mockReturnValue({
      metrics: {
        dataIntegrity: 85,
        lastSuccessfulScrape: mockLocalData.lastUpdated,
        failedOperations: mockLocalData.reliability.failedOperations,
        systemHealth: 'degraded',
        retryQueue: [],
        isStale: true,
        staleDuration: 30,
        totalOperations: 20,
        successfulOperations: 17,
        recommendations: ['System integrity is below optimal levels.']
      },
      isHealthy: false,
      isDegraded: true,
      isCritical: false,
      needsAttention: true
    });

    render(<ReliabilityStatusCard localData={mockLocalData} />);
    
    expect(screen.getByText('Recent Failures:')).toBeInTheDocument();
    expect(screen.getByText('COURSE EXPANSION')).toBeInTheDocument();
    expect(screen.getByText('Recommendations:')).toBeInTheDocument();
  });

  it('renders critical system status with all indicators', () => {
    const mockLocalData = {
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      reliability: {
        dataIntegrity: 60,
        systemHealth: 'critical',
        failedOperations: [
          {
            id: '1',
            type: 'data_fetch',
            timestamp: new Date().toISOString(),
            error: 'Network timeout',
            retryCount: 3,
            maxRetries: 3
          },
          {
            id: '2',
            type: 'course_expansion',
            timestamp: new Date().toISOString(),
            error: 'Authentication failed',
            retryCount: 1,
            maxRetries: 3
          }
        ],
        retryQueue: [
          {
            id: 'retry1',
            operation: {
              id: '2',
              type: 'course_expansion',
              timestamp: new Date().toISOString(),
              error: 'Authentication failed',
              retryCount: 1,
              maxRetries: 3
            },
            scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            status: 'pending'
          }
        ]
      }
    };

    mockUseReliabilityMetrics.mockReturnValue({
      metrics: {
        dataIntegrity: 60,
        lastSuccessfulScrape: mockLocalData.lastUpdated,
        failedOperations: mockLocalData.reliability.failedOperations,
        systemHealth: 'critical',
        retryQueue: mockLocalData.reliability.retryQueue,
        isStale: true,
        staleDuration: 120,
        totalOperations: 20,
        successfulOperations: 12,
        recommendations: [
          'System integrity is below acceptable levels. Consider restarting the scraper service.',
          'Critical failures detected. Check network connectivity and authentication status.'
        ]
      },
      isHealthy: false,
      isDegraded: false,
      isCritical: true,
      needsAttention: true
    });

    render(<ReliabilityStatusCard localData={mockLocalData} />);
    
    expect(screen.getByText('Recent Failures:')).toBeInTheDocument();
    expect(screen.getByText('DATA FETCH')).toBeInTheDocument();
    expect(screen.getByText('COURSE EXPANSION')).toBeInTheDocument();
    expect(screen.getByText('Recommendations:')).toBeInTheDocument();
    expect(screen.getByText('Retry Queue (1):')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows scanning animation when isScanning is true', () => {
    const mockLocalData = {
      lastUpdated: new Date().toISOString(),
      reliability: { dataIntegrity: 100, systemHealth: 'healthy' }
    };

    mockUseReliabilityMetrics.mockReturnValue({
      metrics: {
        dataIntegrity: 100,
        lastSuccessfulScrape: mockLocalData.lastUpdated,
        failedOperations: [],
        systemHealth: 'healthy',
        retryQueue: [],
        isStale: false,
        staleDuration: 1,
        totalOperations: 10,
        successfulOperations: 10,
        recommendations: []
      },
      isHealthy: true,
      isDegraded: false,
      isCritical: false,
      needsAttention: false
    });

    const { container } = render(
      <ReliabilityStatusCard localData={mockLocalData} isScanning={true} />
    );
    
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays quick stats correctly', () => {
    const mockLocalData = {
      lastUpdated: new Date().toISOString(),
      reliability: { dataIntegrity: 95, systemHealth: 'healthy' }
    };

    mockUseReliabilityMetrics.mockReturnValue({
      metrics: {
        dataIntegrity: 95,
        lastSuccessfulScrape: mockLocalData.lastUpdated,
        failedOperations: [],
        systemHealth: 'healthy',
        retryQueue: [],
        isStale: false,
        staleDuration: 10,
        totalOperations: 25,
        successfulOperations: 24,
        recommendations: []
      },
      isHealthy: true,
      isDegraded: false,
      isCritical: false,
      needsAttention: false
    });

    render(<ReliabilityStatusCard localData={mockLocalData} />);
    
    expect(screen.getByText('25')).toBeInTheDocument(); // Total Ops
    expect(screen.getByText('24')).toBeInTheDocument(); // Successful
    expect(screen.getByText('10m')).toBeInTheDocument(); // Data Age
    expect(screen.getByText('Total Ops')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('Data Age')).toBeInTheDocument();
  });
});