// /frontend/src/components/ScrapingStatusBanner.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface ScrapingStatus {
  status: 'healthy' | 'warning' | 'suspended' | 'disabled' | 'unknown';
  status_message: string;
  is_automation_active: boolean;
  is_suspended: boolean;
  consecutive_failures: number;
  max_failures_before_suspension: number;
  last_scrape: any;
}

const ScrapingStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<ScrapingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/errors/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching scraping status:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetSuspension = async () => {
    try {
      const response = await fetch('/api/errors/reset-suspension', {
        method: 'POST'
      });

      if (response.ok) {
        await fetchStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Error resetting suspension:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Refresh status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't show banner if loading, dismissed, or status is healthy
  if (loading || dismissed || !status || status.status === 'healthy') {
    return null;
  }

  const getBannerConfig = () => {
    switch (status.status) {
      case 'suspended':
        return {
          variant: 'destructive' as const,
          icon: <XCircle className="h-4 w-4" />,
          title: 'Auto-Scraping Suspended',
          description: 'Scraping has been suspended due to consecutive failures.',
          showActions: true,
          priority: 'high'
        };
      
      case 'warning':
        return {
          variant: 'default' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Scraping Issues Detected',
          description: `Multiple failures detected (${status.consecutive_failures}/${status.max_failures_before_suspension}). Auto-suspension will occur if issues persist.`,
          showActions: true,
          priority: 'medium'
        };
      
      case 'disabled':
        return {
          variant: 'default' as const,
          icon: <Settings className="h-4 w-4" />,
          title: 'Auto-Scraping Disabled',
          description: 'Automatic scraping is currently disabled in your settings.',
          showActions: false,
          priority: 'low'
        };
      
      default:
        return {
          variant: 'default' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Scraping Status Unknown',
          description: 'Unable to determine current scraping status.',
          showActions: false,
          priority: 'low'
        };
    }
  };

  const config = getBannerConfig();

  return (
    <Alert variant={config.variant} className="mb-6 animate-fade-in">
      {config.icon}
      <AlertTitle className="flex items-center justify-between">
        <span>{config.title}</span>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {status.status.toUpperCase()}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>{config.description}</p>
        
        {config.showActions && (
          <div className="flex flex-wrap gap-2 mt-3">
            {status.is_suspended && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetSuspension}
              >
                <RefreshCw className="h-3 w-3 mr-1 animate-spin-slow" />
                Reset Suspension
              </Button>
            )}
            
            <Link href="/dashboard/errors">
              <Button variant="outline" size="sm">
                <Eye className="h-3 w-3 mr-1" />
                View Error Details
              </Button>
            </Link>
            
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-3 w-3 mr-1" />
                Check Settings
              </Button>
            </Link>
          </div>
        )}
        
        {status.last_scrape && (
          <p className="text-xs text-gray-600 mt-2">
            Last scrape: {new Date(status.last_scrape.scraped_at).toLocaleString()} 
            ({status.last_scrape.status})
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ScrapingStatusBanner;