"use client";

import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface Grade {
  course: string;
  name: string;
  grade: string;
  added?: string;
  closed_at?: string;
}

interface RecentlyGradedProps {
  grades: Grade[];
  isScanning?: boolean;
}

export default function RecentlyGraded({ grades, isScanning }: RecentlyGradedProps) {
  // Sort grades by most recent (you might need to adjust this based on your data structure)
  const sortedGrades = grades
    ?.slice()
    .sort((a, b) => {
      // If you have an 'added' timestamp, use that, otherwise use closed_at
      const dateA = new Date(a.added || a.closed_at || 0);
      const dateB = new Date(b.added || b.closed_at || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 4) || []; // Show top 4 most recent

  return (
    <Card className={`relative overflow-hidden h-full ${isScanning ? 'animate-pulse' : ''}`}>
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
      
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-accent-primary animate-flicker"
              style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
            // RECENTLY GRADED
          </h3>
          <Link href="/history" className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono">
            [VIEW_ALL]
          </Link>
        </div>
        
        <div className="flex-1">
          {sortedGrades.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="font-mono text-4xl text-text-secondary mb-2 opacity-50">?</div>
                <p className="text-text-secondary text-sm font-mono">
                  NO RECENT GRADES DETECTED
                </p>
                <p className="text-text-secondary text-xs font-mono mt-1 opacity-70">
                  // AWAITING GRADE UPDATES
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGrades.map((grade, index) => (
                <div 
                  key={`${grade.course}-${grade.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-background-secondary/30 border border-state-disabled/30 rounded hover:border-accent-primary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-text-primary truncate">
                      {grade.course}
                    </p>
                    <p className="font-mono text-xs text-text-secondary truncate mt-1">
                      {grade.name}
                    </p>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <span 
                      className="font-mono text-lg font-bold text-state-success"
                      style={{ textShadow: '0 0 5px rgba(118, 255, 3, 0.6)' }}
                    >
                      {grade.grade}
                    </span>
                  </div>
                </div>
              ))}
              
              {sortedGrades.length < 4 && (
                <div className="text-center py-2">
                  <p className="text-text-secondary text-xs font-mono opacity-50">
                    // {4 - sortedGrades.length} MORE SLOTS AVAILABLE
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Status indicator */}
        <div className="mt-4 pt-3 border-t border-state-disabled/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary font-mono">
              GRADE_MONITOR:
            </span>
            <span className="text-xs text-state-success font-mono animate-pulse">
              ACTIVE
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}