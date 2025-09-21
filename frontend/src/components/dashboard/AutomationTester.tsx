// /frontend/src/components/dashboard/AutomationTester.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import toast from "react-hot-toast";

export default function AutomationTester() {
  const { getToken } = useAuth();
  const [isTestingScheduler, setIsTestingScheduler] = useState(false);
  const [isTestingScrape, setIsTestingScrape] = useState(false);
  const [isForceQueuing, setIsForceQueuing] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);

  const testScheduler = async () => {
    setIsTestingScheduler(true);
    try {
      const token = await getToken();
      const response = await fetch("/api/test-scheduler", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Test failed: ${await response.text()}`);
      }
      
      const result = await response.json();
      toast.success(`Scheduler test completed! Found ${result.active_users_found} active users`);
    } catch (error) {
      toast.error(`Scheduler test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingScheduler(false);
    }
  };

  const forceQueueAllUsers = async () => {
    setIsForceQueuing(true);
    try {
      const token = await getToken();
      const response = await fetch("/api/force-queue-all-users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Force queue failed: ${await response.text()}`);
      }
      
      const result = await response.json();
      toast.success(`Force queued ${result.queued_count} users for scraping`);
    } catch (error) {
      toast.error(`Force queue failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsForceQueuing(false);
    }
  };

  const getSchedulerStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/scheduler-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${await response.text()}`);
      }
      
      const result = await response.json();
      setSchedulerStatus(result);
      toast.success(`Status updated: ${result.active_users} active users, ${result.users_due_for_scrape} due for scrape`);
    } catch (error) {
      toast.error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testImmediateScrape = async () => {
    setIsTestingScrape(true);
    try {
      const token = await getToken();
      const response = await fetch("/api/test-scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Test failed: ${await response.text()}`);
      }
      
      const result = await response.json();
      toast.success(`Scrape test queued: ${result.message}`);
    } catch (error) {
      toast.error(`Scrape test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingScrape(false);
    }
  };

  return (
    <Card className="p-4 relative overflow-hidden">
      {/* Corner brackets */}
      <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-accent-primary opacity-50"></div>
      <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-accent-primary opacity-50"></div>
      <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-accent-primary opacity-50"></div>
      <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-accent-primary opacity-50"></div>
      
      <h3 className="font-heading text-sm text-accent-primary mb-4"
          style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
        {`// SHARK_TESTING`}
      </h3>
      
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-text-secondary">
            Test scheduler logic (simulates Celery Beat)
          </p>
          <Button
            onClick={testScheduler}
            disabled={isTestingScheduler}
            className="w-full text-xs py-2"
          >
            {isTestingScheduler ? '> TESTING_SCHEDULER...' : '> TEST_SCHEDULER'}
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-text-secondary">
            Force queue ALL active users (ignore schedule)
          </p>
          <Button
            onClick={forceQueueAllUsers}
            disabled={isForceQueuing}
            className="w-full text-xs py-2 bg-orange-600 hover:bg-orange-700"
          >
            {isForceQueuing ? '> FORCE_QUEUING...' : '> FORCE_QUEUE_ALL'}
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-text-secondary">
            Queue single scrape task for current user
          </p>
          <Button
            onClick={testImmediateScrape}
            disabled={isTestingScrape}
            className="w-full text-xs py-2"
          >
            {isTestingScrape ? '> QUEUING_SCRAPE...' : '> TEST_SCRAPE'}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-text-secondary">
            Get detailed scheduler status
          </p>
          <Button
            onClick={getSchedulerStatus}
            className="w-full text-xs py-2 bg-blue-600 hover:bg-blue-700"
          >
            {">"}GET_STATUS
          </Button>
        </div>

        {schedulerStatus && (
          <div className="mt-3 p-2 bg-background-secondary rounded border border-accent-primary/20">
            <p className="font-mono text-xs text-accent-primary mb-1">SCHEDULER STATUS:</p>
            <p className="font-mono text-xs text-text-secondary">
              Total Users: {schedulerStatus.total_users} | 
              Active: {schedulerStatus.active_users} | 
              Due: {schedulerStatus.users_due_for_scrape}
            </p>
          </div>
        )}
        
        <div className="mt-3 p-2 bg-background-secondary rounded border border-accent-primary/20">
          <p className="font-mono text-xs text-text-secondary">
            Tip: Use TEST_SCHEDULER to test without Celery Beat running
          </p>
          <p className="font-mono text-xs text-text-secondary">
            Warning: FORCE_QUEUE_ALL ignores user schedules - use carefully
          </p>
        </div>
      </div>
    </Card>
  );
}