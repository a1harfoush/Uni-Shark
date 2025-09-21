"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

interface Stats {
  agents: number;
  checks: number;
  alerts: number;
  uptime: string;
}

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-baseline">
    <span className="text-text-secondary text-xs">{label}</span>
    <span className="font-mono text-text-primary text-xs font-bold">{value}</span>
  </div>
);

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats>({ 
    agents: 1337, 
    checks: 9001, 
    alerts: 4815, 
    uptime: "127d 14h 32m" 
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        agents: prev.agents + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0),
        checks: prev.checks + Math.floor(Math.random() * 15) + 5,
        alerts: prev.alerts + (Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0),
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full">
      <h3 className="font-heading text-accent-primary mb-4 text-sm">// GLOBAL STATISTICS</h3>
      <div className="font-body space-y-3">
        <StatItem label="Active Agents:" value={stats.agents.toLocaleString()} />
        <StatItem label="Checks/Hour:" value={stats.checks.toLocaleString()} />
        <StatItem label="Alerts (24h):" value={stats.alerts.toLocaleString()} />
        <StatItem label="System Uptime:" value={stats.uptime} />
        
        <div className="pt-4 border-t border-state-disabled">
          <h3 className="font-heading text-accent-primary mb-3 text-sm">// SYSTEM STATUS</h3>
          <div className="space-y-2">
            <StatItem label="Model Version:" value="v4.2.1" />
            <StatItem label="Learning Mode:" value="ADAPTIVE" />
            <StatItem label="Security Level:" value="MAXIMUM" />
            <div className="flex justify-between items-baseline">
              <span className="text-text-secondary text-xs">Network Status:</span>
              <span className="text-state-success text-xs font-bold animate-pulse">ONLINE</span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-state-disabled">
          <h3 className="font-heading text-accent-primary mb-3 text-sm">// PERFORMANCE</h3>
          <div className="space-y-2">
            <StatItem label="CPU Usage:" value="23.4%" />
            <StatItem label="Memory:" value="1.2GB" />
            <StatItem label="Response Time:" value="0.8ms" />
            <StatItem label="Success Rate:" value="99.7%" />
          </div>
        </div>
      </div>
    </Card>
  );
}