// /frontend/src/components/dashboard/FutureTargets.tsx
"use client";

import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface FutureTargetsProps {
    value: number;
    isScanning?: boolean;
}

export default function FutureTargets({ value, isScanning }: FutureTargetsProps) {
    const priorityColors = {
        low: "text-text-primary"
    };

    const priorityGlow = {
        low: "rgba(195, 232, 141, 0.4)"
    };

    return (
        <Link href="/history" className="block md:col-span-3">
            <Card className={`relative overflow-hidden h-full transition-all duration-300 hover:border-accent-primary/50 ${isScanning ? 'animate-pulse' : ''}`}>
                {/* Corner brackets */}
                <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
                <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
                <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
                <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
                
                <div className="p-4 h-full flex flex-col justify-between">
                    <div>
                        <h3 className="font-heading text-sm text-accent-primary mb-3"
                            style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                            {`// FUTURE_TARGETS`}
                        </h3>
                        
                        <div className="flex items-baseline justify-between">
                            <span 
                                className={`font-mono text-4xl font-bold ${priorityColors.low} animate-glowPulse`}
                                style={{ 
                                    textShadow: `0 0 8px ${priorityGlow.low}`,
                                    filter: value > 0 ? `drop-shadow(0 0 5px ${priorityGlow.low})` : 'none'
                                }}
                            >
                                {value.toLocaleString()}
                            </span>
                            
                            <span className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono cursor-pointer">
                                [VIEW]
                            </span>
                        </div>
                    </div>
                    
                    <p className="text-xs text-text-secondary font-mono mt-2 opacity-80">
                        UPCOMING
                    </p>
                </div>
            </Card>
        </Link>
    );
}