"use client";

import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  href?: string;
  isScanning?: boolean;
  priority?: "high" | "medium" | "low";
}

export default function KPICard({ title, value, subtitle, href, isScanning, priority = "medium" }: KPICardProps) {
  const priorityColors = {
    high: "text-state-error",
    medium: "text-state-warning", 
    low: "text-text-primary"
  };

  const priorityGlow = {
    high: "rgba(244, 67, 54, 0.4)",
    medium: "rgba(255, 145, 0, 0.4)",
    low: "rgba(195, 232, 141, 0.4)"
  };

  const content = (
    <Card className={`relative overflow-hidden h-full transition-all duration-300 hover:border-accent-primary/50 ${isScanning ? 'animate-pulse' : ''}`}>
      {/* Corner brackets */}
      <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
      
      <div className="p-4 h-full flex flex-col justify-between">
        <div>
          <h3 className={`font-body mb-3 font-bold ${
            title === 'TOTAL_SCRAPES' || title === 'TARGETS_TODAY' || title === 'TOTAL_ABSENCES'
              ? 'text-base text-text-primary' 
              : 'text-sm text-text-secondary'
          }`}>
            // {title}
          </h3>
          
          <div className="flex items-baseline justify-between">
            <span 
              className={`font-mono text-4xl font-bold ${priorityColors[priority]} animate-glowPulse`}
              style={{ 
                textShadow: `0 0 8px ${priorityGlow[priority]}`,
                filter: value > 0 ? `drop-shadow(0 0 5px ${priorityGlow[priority]})` : 'none'
              }}
            >
              {value.toLocaleString()}
            </span>
            
            {href && (
              <span className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono cursor-pointer">
                [VIEW]
              </span>
            )}
          </div>
        </div>
        
        {subtitle && (
          <p className="text-xs text-text-secondary font-mono mt-2 opacity-80">
            {subtitle}
          </p>
        )}
        
        {/* Priority indicator */}
        {value > 0 && (
          <div className="absolute top-2 right-8">
            <div 
              className={`w-2 h-2 rounded-full ${priority === 'high' ? 'bg-state-error' : priority === 'medium' ? 'bg-state-warning' : 'bg-state-success'} animate-pulse`}
              style={{ 
                boxShadow: `0 0 6px ${priorityGlow[priority]}`
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}