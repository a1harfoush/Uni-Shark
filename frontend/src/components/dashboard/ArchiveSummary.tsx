"use client";

import { Card } from "@/components/ui/Card";
import { TimestampWithStaleness, DataIntegrityIndicator } from "@/components/ui/StalenessIndicator";
import Link from "next/link";

interface ArchiveSummaryProps {
  coursesTracked: number;
  quizzesFound: number;
  assignmentsFound: number;
  absencesFound?: number;
  lastUpdated?: string;
  totalScrapes: number;
  isScanning?: boolean;
  dataIntegrity?: number;
  failedOperations?: number;
}

export default function ArchiveSummary({ 
  coursesTracked, 
  quizzesFound, 
  assignmentsFound, 
  absencesFound = 0,
  lastUpdated, 
  totalScrapes,
  isScanning,
  dataIntegrity = 100,
  failedOperations = 0
}: ArchiveSummaryProps) {

  const stats = [
    { label: "COURSES_TRACKED", value: coursesTracked },
    { label: "QUIZZES_FOUND", value: quizzesFound },
    { label: "ASSIGNMENTS_FOUND", value: assignmentsFound },
    { label: "ABSENCES_FOUND", value: absencesFound }
  ];

  return (
    <Card className={`relative overflow-hidden ${isScanning ? 'animate-pulse' : ''}`}>
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-accent-primary"
              style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
            // LOCAL DATA ARCHIVE
          </h3>
          <Link href="/history" className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono">
            [FULL_ARCHIVE]
          </Link>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-2xl text-text-heading font-bold mb-1">
                {stat.value.toLocaleString()}
              </div>
              <div className="font-mono text-xs text-text-secondary">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Enhanced Status Bar with Timestamp and Staleness */}
        <div className="border-t border-state-disabled/30 pt-3">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">
                LAST_UPDATED: 
              </span>
              <TimestampWithStaleness
                timestamp={lastUpdated || new Date().toISOString()}
                stalenessThreshold={15}
                useShortFormat={false}
                className="text-text-primary"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-state-success rounded-full animate-pulse"></div>
              <span className="text-text-secondary">ARCHIVE_READY</span>
            </div>
          </div>
          
          {/* Additional status info */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-secondary">
              TOTAL_SCRAPES: <span className="text-text-primary">{totalScrapes}</span>
            </span>
            <span className="text-text-secondary">
              STATUS: <span className="text-state-success animate-pulse">OPERATIONAL</span>
            </span>
          </div>
        </div>
        
        {/* Enhanced Data Health Indicator */}
        <div className="mt-3 p-2 bg-background-secondary/30 border border-state-disabled/30 rounded">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-secondary">DATA_INTEGRITY:</span>
            <DataIntegrityIndicator
              successRate={dataIntegrity}
              totalOperations={totalScrapes}
              failedOperations={failedOperations}
              showDetails={false}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}