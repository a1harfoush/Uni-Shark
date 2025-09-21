"use client";

import { useEffect, useState } from "react";

export default function GlobeVisual() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer ring */}
      <div className="absolute w-64 h-64 border-2 border-accent-primary rounded-full opacity-30 animate-pulse"></div>
      
      {/* Middle ring */}
      <div className="absolute w-48 h-48 border border-text-secondary rounded-full opacity-50"></div>
      
      {/* Inner rotating element */}
      <div 
        className="absolute w-32 h-32 border border-accent-primary rounded-full"
        style={{ 
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(from 0deg, transparent 0deg, rgba(137, 221, 255, 0.3) 90deg, transparent 180deg)`
        }}
      >
        {/* Rotating dots */}
        <div className="absolute top-0 left-1/2 w-2 h-2 bg-accent-primary rounded-full transform -translate-x-1/2 -translate-y-1"></div>
        <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-state-success rounded-full transform -translate-x-1/2 translate-y-1"></div>
        <div className="absolute left-0 top-1/2 w-2 h-2 bg-state-warning rounded-full transform -translate-x-1 -translate-y-1/2"></div>
        <div className="absolute right-0 top-1/2 w-2 h-2 bg-state-error rounded-full transform translate-x-1 -translate-y-1/2"></div>
      </div>
      
      {/* Center core */}
      <div className="absolute w-16 h-16 bg-background-secondary border-2 border-accent-primary rounded-full flex items-center justify-center">
        <div className="w-8 h-8 bg-accent-primary rounded-full animate-pulse"></div>
      </div>
      
      {/* Scanning lines */}
      <div 
        className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-70"
        style={{ transform: `rotate(${rotation * 2}deg)` }}
      ></div>
      <div 
        className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-state-success to-transparent opacity-50"
        style={{ transform: `rotate(${rotation * -1.5}deg)` }}
      ></div>
      
      {/* Data points */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-text-primary rounded-full animate-pulse"
          style={{
            top: `${50 + 30 * Math.sin((rotation + i * 45) * Math.PI / 180)}%`,
            left: `${50 + 30 * Math.cos((rotation + i * 45) * Math.PI / 180)}%`,
            animationDelay: `${i * 0.2}s`
          }}
        ></div>
      ))}
    </div>
  );
}