"use client";

import React from "react";

interface TestimonialButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "minimal";
}

const TestimonialButton: React.FC<TestimonialButtonProps> = ({ 
  className = "", 
  variant = "primary" 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-background-secondary/50 border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary";
      case "minimal":
        return "bg-transparent border-accent-primary/30 text-accent-primary hover:bg-accent-primary/5 hover:border-accent-primary/60";
      default:
        return "bg-accent-primary/10 border-accent-primary text-accent-primary hover:bg-accent-primary/20 hover:border-text-heading hover:text-text-heading";
    }
  };

  // Handle click for mobile compatibility
  const handleClick = () => {
    // Try Tally popup first
    if (typeof window !== 'undefined' && (window as any).Tally) {
      (window as any).Tally.openPopup('3X6NE4', {
        width: 428,
        alignLeft: 1,
        overlay: 1,
        emojiText: '🦈',
        emojiAnimation: 'tada',
        formEventsForwarding: 1
      });
    } else {
      // Fallback to direct link for mobile or if Tally isn't loaded
      window.open('https://tally.so/r/3X6NE4', '_blank', 'width=428,height=600');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative overflow-hidden
        px-4 py-2 
        border-2 rounded
        font-mono text-sm font-bold
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary
        group
        touch-manipulation
        ${getVariantStyles()}
        ${className}
      `}
      // Keep data attributes as backup
      data-tally-open="3X6NE4"
      data-tally-width="428"
      data-tally-align-left="1"
      data-tally-overlay="1"
      data-tally-emoji-text="🦈"
      data-tally-emoji-animation="tada"
      data-tally-form-events-forwarding="1"
    >
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-accent-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-accent-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-accent-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-accent-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-accent-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
      
      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        <span className="text-lg">🦈</span>
        <span className="group-hover:animate-pulse">SHARE_HUNT_STORY</span>
      </span>
    </button>
  );
};

export default TestimonialButton;