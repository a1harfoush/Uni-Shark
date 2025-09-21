"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { useDashboard } from "@/lib/context/DashboardContext";
import TestimonialButton from "@/components/ui/TestimonialButton";

interface ScanProgressProps {
  logs: string[];
}

export default function ScanProgress({ logs }: ScanProgressProps) {
  const { scanProgress } = useDashboard();
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize scan start time and start the independent timer
  useEffect(() => {
    const startTime = new Date();
    setScanStartTime(startTime);
    setElapsedTime(0);

    // Start independent timer that updates every second
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-scroll logs to bottom within the container only
  useEffect(() => {
    if (logsEndRef.current) {
      const container = logsEndRef.current.closest('.overflow-y-auto');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <Card className="relative overflow-hidden mb-6 border-accent-primary/50 bg-accent-primary/5">
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
      
      <div className="p-4 md:p-6">
        <h2 className="font-heading text-lg md:text-xl text-accent-primary mb-4 text-center animate-flicker" style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
          // HUNT IN PROGRESS
        </h2>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-text-secondary">PROGRESS</span>
            <span className="font-mono text-xs text-accent-primary">{scanProgress.percentage || 0}%</span>
          </div>
          <div className="w-full bg-background-secondary border border-accent-primary/30 rounded h-3 overflow-hidden">
            <div 
              className="h-full bg-accent-primary transition-all duration-1000 ease-out"
              style={{ 
                width: `${scanProgress.percentage || 0}%`,
                boxShadow: '0 0 10px rgba(137, 221, 255, 0.5)'
              }}
            />
          </div>
        </div>

        {/* Live Console */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-text-secondary">LIVE CONSOLE</span>
            <span className="font-mono text-xs text-accent-primary">
              ELAPSED: {elapsedTime}s
            </span>
          </div>
          <div className="bg-black/70 border border-accent-primary/30 rounded p-3 md:p-4 h-24 md:h-32 font-mono text-xs text-text-primary overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1 text-green-400">
                {log}
              </div>
            ))}
            <div className="animate-pulse text-accent-primary">_</div>
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Current Status */}
        <div className="text-center p-3 bg-accent-primary/10 border border-accent-primary/30 rounded mb-4">
          <p className="font-mono text-accent-primary animate-pulse text-sm">
            STATUS: {scanProgress.message || 'SHARK RESTING IN DEPTHS...'}
          </p>
        </div>

        {/* Testimonial Call-to-Action - Show after 30 seconds of hunting */}
        {elapsedTime >= 30 && elapsedTime < 120 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-accent-primary/5 to-transparent border border-accent-primary/20 rounded">
            <div className="text-center">
              <p className="font-mono text-xs text-accent-primary mb-3 animate-pulse">
                🦈 WHILE THE SHARK HUNTS...
              </p>
              <p className="font-mono text-xs text-text-secondary mb-3">
                Share your hunt experience with other digital predators
              </p>
              <TestimonialButton 
                variant="secondary" 
                className="text-xs px-4 py-2"
              />
            </div>
          </div>
        )}

        {/* Extended hunt encouragement - Show after 2 minutes */}
        {elapsedTime >= 120 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-state-warning/10 to-transparent border border-state-warning/30 rounded">
            <div className="text-center">
              <p className="font-mono text-xs text-state-warning mb-3 animate-pulse">
                🦈 DEEP SEA HUNT IN PROGRESS...
              </p>
              <p className="font-mono text-xs text-text-secondary mb-3">
                Help us improve the shark's hunting abilities
              </p>
              <TestimonialButton 
                variant="primary" 
                className="text-xs px-4 py-2"
              />
            </div>
          </div>
        )}

        <div className="text-center text-xs text-text-secondary mt-4 font-mono">
          ⚠️ DO NOT CLOSE BROWSER DURING ACTIVE HUNT
        </div>
      </div>
    </Card>
  );
}