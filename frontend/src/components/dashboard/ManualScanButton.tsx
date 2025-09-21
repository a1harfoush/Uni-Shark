"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ManualScanButtonProps {
  onClick: () => void;
}

export default function ManualScanButton({ onClick }: ManualScanButtonProps) {
  return (
    <Card className="relative overflow-hidden mb-6">
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
      
      <div className="text-center p-4 md:p-6">
        <h2 className="font-heading text-base md:text-lg text-accent-primary mb-4 animate-flicker" style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
          // MANUAL HUNT PROTOCOL
        </h2>
        <div className="relative inline-block">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick();
              return false;
            }} 
            className="bg-accent-primary text-background-primary font-heading font-bold border-none hover:bg-white hover:shadow-glow-primary active:scale-95 transition-all duration-200 px-8 md:px-12 py-3 md:py-4 text-sm md:text-lg uppercase tracking-wider animate-flicker"
            type="button"
          >
            {'>'} INITIATE HUNT
          </button>
        </div>
        <p className="text-text-secondary text-xs md:text-sm mt-4 font-body">
          // INITIATE DEEP HUNT OF TARGET SYSTEMS
        </p>
      </div>
    </Card>
  );
}