"use client";

import React, { useState } from "react";
import BugReportModal from "./BugReportModal";

interface BugReportButtonProps {
  className?: string;
  variant?: "icon" | "text" | "minimal";
}

const BugReportButton: React.FC<BugReportButtonProps> = ({ 
  className = "", 
  variant = "icon" 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case "text":
        return "px-3 py-2 bg-background-secondary/50 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary";
      case "minimal":
        return "p-2 bg-transparent text-text-secondary hover:text-accent-primary hover:bg-accent-primary/5";
      default: // icon
        return "p-2 bg-background-secondary/30 border border-accent-primary/20 text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/50";
    }
  };

  const getContent = () => {
    switch (variant) {
      case "text":
        return (
          <span className="flex items-center gap-2 font-mono text-sm">
            <span>🐞</span>
            <span>REPORT_ISSUE</span>
          </span>
        );
      case "minimal":
        return <span className="text-lg">🐞</span>;
      default: // icon
        return <span className="text-lg">🐞</span>;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          relative overflow-hidden
          rounded
          font-mono font-bold
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary
          group
          touch-manipulation
          ${getVariantStyles()}
          ${className}
        `}
        title="Report a bug or issue"
        aria-label="Report a bug or issue"
      >
        {/* Corner brackets for non-minimal variants */}
        {variant !== "minimal" && (
          <>
            <div className="absolute top-0 left-0 w-1 h-1 border-l border-t border-accent-primary opacity-30 group-hover:opacity-60 transition-opacity"></div>
            <div className="absolute top-0 right-0 w-1 h-1 border-r border-t border-accent-primary opacity-30 group-hover:opacity-60 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-1 h-1 border-l border-b border-accent-primary opacity-30 group-hover:opacity-60 transition-opacity"></div>
            <div className="absolute bottom-0 right-0 w-1 h-1 border-r border-b border-accent-primary opacity-30 group-hover:opacity-60 transition-opacity"></div>
          </>
        )}
        
        {/* Button content */}
        <span className="relative z-10 group-hover:animate-pulse">
          {getContent()}
        </span>
      </button>

      {/* Modal */}
      <BugReportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default BugReportButton;