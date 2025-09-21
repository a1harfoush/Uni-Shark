// /frontend/src/components/dashboard/DashboardStats.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { SystemHealthIndicator, ReliabilityBadge } from "@/components/ui/SystemHealthIndicator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DashboardStatsProps {
  stats: {
    tasks_today: number;
    tasks_this_week: number;
    tasks_later: number;
    new_absences: number;
    recent_grades: number;
  };
  isScanning: boolean;
  localData?: any;
}

const StatCard = ({ title, value, isScanning, href }: { title: string, value: number, isScanning: boolean, href: string }) => (
  <Card className={cn("p-4 relative overflow-hidden", isScanning && "animate-pulse")}>
    {/* Corner brackets */}
    <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-accent-primary opacity-50"></div>
    <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-accent-primary opacity-50"></div>
    <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-accent-primary opacity-50"></div>
    <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-accent-primary opacity-50"></div>
    
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="font-heading text-sm text-accent-primary mb-2"
            style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
          {`// ${title}`}
        </h3>
        <p className="font-mono text-4xl text-text-heading animate-glowPulse"
           style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}>
          {value}
        </p>
      </div>
      <Link 
        href={href} 
        className="text-xs text-accent-primary hover:text-text-heading transition-colors mt-1 font-mono"
      >
        [VIEW]
      </Link>
    </div>
  </Card>
);

export default function DashboardStats({ stats, isScanning, localData }: DashboardStatsProps) {
  return (
    <div className="space-y-4 mb-8">
      {/* System Health Indicator */}
      {localData && (
        <div className="flex items-center justify-between p-3 bg-background-secondary/30 rounded-lg border border-accent-primary/20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-accent-primary">// SYSTEM_STATUS</span>
            <SystemHealthIndicator localData={localData} showDetails={true} />
          </div>
          <ReliabilityBadge localData={localData} />
        </div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="TARGETS_TODAY" value={stats.tasks_today} isScanning={isScanning} href="/history" />
        <StatCard title="TARGETS_WEEK" value={stats.tasks_this_week} isScanning={isScanning} href="/history" />
        <StatCard title="FUTURE_TARGETS" value={stats.tasks_later} isScanning={isScanning} href="/history" />
      </div>
    </div>
  );
}