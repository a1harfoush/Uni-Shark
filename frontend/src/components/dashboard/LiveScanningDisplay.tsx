"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

interface LiveScanningDisplayProps {
  isScanning: boolean;
  dashboardData?: any; // Add dashboard data to monitor for changes
}

export default function LiveScanningDisplay({ isScanning, dashboardData }: LiveScanningDisplayProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [missionText, setMissionText] = useState("INITIALIZING SCAN PROTOCOL...");
  const [currentStep, setCurrentStep] = useState(0);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);

  // Reset all state when component mounts or when isScanning changes from true to false
  useEffect(() => {
    if (!isScanning) {
      setLogs([]);
      setCurrentStep(0);
      setMissionText("INITIALIZING SCAN PROTOCOL...");
      setScanStartTime(null);
      return;
    }

    // Set scan start time when scanning begins
    if (!scanStartTime) {
      setScanStartTime(new Date());
    }

    const missionTexts = [
      "INITIALIZING SCAN PROTOCOL...",
      "ESTABLISHING SECURE CONNECTION...",
      "AUTHENTICATING CREDENTIALS...",
      "BYPASSING SECURITY MEASURES...",
      "EXTRACTING TARGET DATA...",
      "PROCESSING ACADEMIC RECORDS...",
      "ANALYZING COURSE STRUCTURES...",
      "SCANNING FOR NEW ASSIGNMENTS...",
      "DETECTING GRADE UPDATES...",
      "FINALIZING DATA EXTRACTION..."
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < missionTexts.length) {
        setMissionText(missionTexts[currentIndex]);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${missionTexts[currentIndex]}`]);
        setCurrentStep(currentIndex + 1);
        currentIndex++;
      } else {
        // Keep cycling through "waiting" messages while scanning continues
        const elapsed = scanStartTime ? Math.floor((Date.now() - scanStartTime.getTime()) / 1000) : 0;
        const waitingMessages = [
          `MISSION IN PROGRESS... (${elapsed}s)`,
          `AWAITING SERVER RESPONSE... (${elapsed}s)`,
          `PROCESSING DATA STREAM... (${elapsed}s)`,
          `MAINTAINING CONNECTION... (${elapsed}s)`,
          `SCANNING CONTINUES... (${elapsed}s)`,
          `DEEP SCAN IN PROGRESS... (${elapsed}s)`,
          `EXTRACTING COURSE DATA... (${elapsed}s)`,
          `ANALYZING ASSIGNMENTS... (${elapsed}s)`
        ];
        const waitingIndex = Math.floor(Math.random() * waitingMessages.length);
        setMissionText(waitingMessages[waitingIndex]);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${waitingMessages[waitingIndex]}`]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isScanning, scanStartTime]);

  if (!isScanning) return null;

  // Progress calculation: reach 90% during mission steps, then pulse between 90-95% while waiting
  const baseProgress = Math.min((currentStep / 10) * 90, 90);
  const progressPercentage = currentStep >= 10 ? 
    90 + (Math.sin(Date.now() / 1000) * 2.5 + 2.5) : // Pulse between 90-95% when waiting
    baseProgress;

  return (
    <Card className="p-6 mb-8 border-accent-primary/50 bg-accent-primary/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="font-heading text-xl text-accent-primary mb-2">
            // ACTIVE SCAN IN PROGRESS
          </h2>
          <div className="w-full bg-background-secondary/50 rounded-full h-2 mb-4">
            <div 
              className="bg-accent-primary h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Current Mission */}
        <div className="text-center p-4 bg-accent-primary/10 border border-accent-primary/30 rounded">
          <p className="font-mono text-accent-primary animate-pulse text-lg">
            {'>'} {missionText}
          </p>
        </div>

        {/* Live Log Terminal */}
        <div className="bg-background-secondary/80 p-4 rounded font-mono text-sm max-h-48 overflow-y-auto border">
          <div className="text-accent-primary mb-2 font-bold">
            // REALTIME SCAN LOG
          </div>
          {logs.length === 0 ? (
            <p className="text-text-secondary animate-pulse">Initializing scan sequence...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-text-secondary mb-1 opacity-80">
                {log}
              </div>
            ))
          )}
          <div className="text-accent-primary animate-pulse mt-2">
            {'>'} <span className="animate-ping">█</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-background-secondary/50 rounded">
            <div className="w-3 h-3 bg-accent-primary rounded-full mx-auto mb-1 animate-pulse"></div>
            <p className="text-xs text-text-secondary">CONNECTION</p>
          </div>
          <div className="p-2 bg-background-secondary/50 rounded">
            <div className="w-3 h-3 bg-accent-primary rounded-full mx-auto mb-1 animate-pulse"></div>
            <p className="text-xs text-text-secondary">EXTRACTION</p>
          </div>
          <div className="p-2 bg-background-secondary/50 rounded">
            <div className="w-3 h-3 bg-accent-primary rounded-full mx-auto mb-1 animate-pulse"></div>
            <p className="text-xs text-text-secondary">PROCESSING</p>
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center text-xs text-text-secondary">
          <p>⚠️ Do not close this page while scan is in progress</p>
          {scanStartTime && (
            <p className="mt-1">
              Scan duration: {Math.floor((Date.now() - scanStartTime.getTime()) / 1000)}s
              {Math.floor((Date.now() - scanStartTime.getTime()) / 1000) > 120 && 
                " | Deep scan in progress..."}
              {Math.floor((Date.now() - scanStartTime.getTime()) / 1000) > 240 && 
                " | Extended scan - large dataset detected..."}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}