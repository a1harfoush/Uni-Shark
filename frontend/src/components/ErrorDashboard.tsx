// /frontend/src/components/ErrorDashboard.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Shield,
  Wifi,
  Server,
  Eye,
  Settings
} from 'lucide-react';

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  occurred_at: string;
  consecutive_failure_count: number;
  additional_details?: any;
}

interface ErrorSummary {
  total_errors: number;
  recent_errors: number;
  is_suspended: boolean;
  consecutive_failures: number;
  max_consecutive_failures: number;
  last_error_at: string | null;
  error_types: string[];
}

interface ScrapingStatus {
  status: 'healthy' | 'warning' | 'suspended' | 'disabled' | 'unknown';
  status_message: string;
  is_automation_active: boolean;
  is_suspended: boolean;
  consecutive_failures: number;
  max_failures_before_suspension: number;
  last_scrape: any;
  suspended_at: string | null;
  suspension_reason: string | null;
}

const ErrorDashboard: React.FC = () => {
  const [errorHistory, setErrorHistory] = useState<ErrorLog[]>([]);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchErrorData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch all error data in parallel
      const [historyRes, summaryRes, statusRes] = await Promise.all([
        fetch('/api/errors/history'),
        fetch('/api/errors/summary'),
        fetch('/api/errors/status')
      ]);

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setErrorHistory(historyData.error_history || []);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setErrorSummary(summaryData);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setScrapingStatus(statusData);
      }

    } catch (error) {
      console.error('Error fetching error data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetSuspension = async () => {
    try {
      const response = await fetch('/api/errors/reset-suspension', {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh data after reset
        await fetchErrorData();
      }
    } catch (error) {
      console.error('Error resetting suspension:', error);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'suspended': return 'text-red-600 bg-red-50';
      case 'disabled': return 'text-gray-600 bg-gray-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'suspended': return <XCircle className="h-5 w-5" />;
      case 'disabled': return <Shield className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getErrorTypeIcon = (errorType: string) => {
    if (errorType.includes('credentials')) return <Shield className="h-4 w-4" />;
    if (errorType.includes('captcha')) return <Eye className="h-4 w-4" />;
    if (errorType.includes('network') || errorType.includes('connection')) return <Wifi className="h-4 w-4" />;
    if (errorType.includes('dulms') || errorType.includes('server')) return <Server className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const formatErrorType = (errorType: string) => {
    return errorType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin-slow mr-2" />
        Loading error data...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Overview */}
      {scrapingStatus && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Scraping Status</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchErrorData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin-slow' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-3 p-3 rounded-lg ${getStatusColor(scrapingStatus.status)}`}>
              {getStatusIcon(scrapingStatus.status)}
              <div>
                <p className="font-medium">{scrapingStatus.status_message}</p>
                {scrapingStatus.consecutive_failures > 0 && (
                  <p className="text-sm opacity-75">
                    {scrapingStatus.consecutive_failures} consecutive failures 
                    (max: {scrapingStatus.max_failures_before_suspension})
                  </p>
                )}
              </div>
            </div>

            {scrapingStatus.is_suspended && (
              <Alert className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Auto-Scraping Suspended</AlertTitle>
                <AlertDescription className="mt-2">
                  <p>{scrapingStatus.suspension_reason}</p>
                  {scrapingStatus.suspended_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      Suspended at: {formatDateTime(scrapingStatus.suspended_at)}
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={resetSuspension}
                  >
                    Reset Suspension
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Summary Cards */}
      {errorSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{errorSummary.total_errors}</p>
                  <p className="text-sm text-gray-600">Total Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{errorSummary.recent_errors}</p>
                  <p className="text-sm text-gray-600">Last 24h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{errorSummary.consecutive_failures}</p>
                  <p className="text-sm text-gray-600">Consecutive</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{errorSummary.error_types.length}</p>
                  <p className="text-sm text-gray-600">Error Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error History */}
      <Card>
        <CardHeader>
          <CardTitle>Error History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList>
              <TabsTrigger value="recent">Recent Errors</TabsTrigger>
              <TabsTrigger value="all">All History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              {errorHistory.filter(error => error.error_type !== 'success').slice(0, 10).map((error) => (
                <div key={error.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getErrorTypeIcon(error.error_type)}
                      <Badge variant="outline">
                        {formatErrorType(error.error_type)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Failure #{error.consecutive_failure_count}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(error.occurred_at)}
                    </span>
                  </div>
                  <p className="text-sm">{error.error_message}</p>
                  {error.additional_details && Object.keys(error.additional_details).length > 0 && (
                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer">Additional Details</summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(error.additional_details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              
              {errorHistory.filter(error => error.error_type !== 'success').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No errors found! Your scraping is working perfectly.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4">
              {errorHistory.map((error) => (
                <div key={error.id} className={`border rounded-lg p-4 space-y-2 ${
                  error.error_type === 'success' ? 'bg-green-50 border-green-200' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {error.error_type === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        getErrorTypeIcon(error.error_type)
                      )}
                      <Badge variant={error.error_type === 'success' ? 'default' : 'outline'}>
                        {formatErrorType(error.error_type)}
                      </Badge>
                      {error.error_type !== 'success' && (
                        <span className="text-sm text-gray-500">
                          Failure #{error.consecutive_failure_count}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(error.occurred_at)}
                    </span>
                  </div>
                  <p className="text-sm">{error.error_message}</p>
                </div>
              ))}
              
              {errorHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>No history available yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorDashboard;