"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface LogEntry {
  text: string;
  status: "success" | "warning" | "error" | "info";
  timestamp: string;
}

const logTemplates = [
  { text: "AGENT_4221 :: SCAN COMPLETE. 2 NEW ASSIGNMENTS FOUND.", status: "success" as const },
  { text: "AGENT_3891 :: DEADLINE IMMINENT :: CSC322 QUIZ 3.", status: "warning" as const },
  { text: "AGENT_5012 :: CAPTCHA SOLVED :: 1.2s.", status: "info" as const },
  { text: "AGENT_1138 :: AUTH_ERROR :: CREDENTIALS INVALID.", status: "error" as const },
  { text: "AGENT_7652 :: NEW ABSENCE DETECTED :: CALCULUS III", status: "warning" as const },
  { text: "SYSTEM :: DISPATCHING 152 NOTIFICATIONS...", status: "info" as const },
  { text: "AGENT_9001 :: GRADE UPDATE :: DATABASE SYSTEMS A+", status: "success" as const },
  { text: "AGENT_2847 :: DISCORD WEBHOOK DELIVERED :: 0.8s", status: "success" as const },
  { text: "AGENT_6543 :: SCANNING DULMS PORTAL...", status: "info" as const },
  { text: "SYSTEM :: NEURAL NETWORK OPTIMIZING...", status: "info" as const },
  { text: "AGENT_1337 :: DEADLINE ALERT :: PHYSICS LAB DUE 2H", status: "warning" as const },
  { text: "AGENT_4815 :: CAPTCHA BYPASS SUCCESSFUL", status: "success" as const },
];

const statusColors = {
  success: "text-state-success",
  warning: "text-state-warning", 
  error: "text-state-error",
  info: "text-accent-primary",
};

const generateTimestamp = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
};

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Initial population
    const initialLogs: LogEntry[] = [];
    for (let i = 0; i < 12; i++) {
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      initialLogs.push({
        ...template,
        timestamp: generateTimestamp(),
      });
    }
    setLogs(initialLogs);

    const interval = setInterval(() => {
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const newLog: LogEntry = {
        ...template,
        timestamp: generateTimestamp(),
      };
      
      setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 11)]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full overflow-hidden">
      <h3 className="font-heading text-accent-primary mb-4 text-sm">// LIVE ACTIVITY FEED</h3>
      <div className="font-body text-xs space-y-2 overflow-hidden h-full">
        {logs.map((log, index) => (
          <div 
            key={`${log.timestamp}-${index}`} 
            className={cn(
              "transition-all duration-500 ease-in-out",
              index === 0 ? "animate-pulse" : ""
            )}
          >
            <div className="flex items-start gap-2">
              <span className="text-text-secondary font-mono text-[10px] shrink-0">
                {log.timestamp}
              </span>
              <div className="min-w-0 flex-1">
                <span className={cn(statusColors[log.status], "font-bold")}>
                  [{log.status.toUpperCase()}]
                </span>
                <span className="text-text-primary ml-2 break-words">
                  {log.text}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}