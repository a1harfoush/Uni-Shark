// /frontend/src/app/(app)/settings/page.tsx
"use client";
import SettingsForm from "@/components/forms/SettingsForm";
import TestimonialButton from "@/components/ui/TestimonialButton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

// Create a client
const queryClient = new QueryClient();

export default function SettingsPage() {
  return (
    <QueryClientProvider client={queryClient}>
        <div className="min-h-screen grid-background relative">
            
            <div className="relative z-10 p-4 md:p-6">
                {/* Enhanced Header */}
                <div className="mb-4 md:mb-6 lg:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4 gap-1 md:gap-2">
                        <h1 className="font-heading text-lg md:text-xl lg:text-2xl xl:text-3xl text-text-heading"
                            style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}>
                            {"// SHARK CONFIGURATION PANEL"}
                        </h1>
                        <div className="font-body text-xs text-accent-primary">
                            [DEPLOYMENT_INTERFACE]
                        </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-50"></div>
                </div>
                
                <SettingsForm />
                
                
                {/* Testimonial Section */}
                <div className="mt-8 pt-6 border-t border-accent-primary/20">
                    <div className="text-center">
                        <h2 className="font-heading text-lg text-accent-primary mb-3 animate-flicker"
                            style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                            {"// SHARE YOUR HUNT EXPERIENCE"}
                        </h2>
                        <p className="font-mono text-sm text-text-secondary mb-4 max-w-md mx-auto">
                            Help other digital predators by sharing your experience with the shark hunting system
                        </p>
                        <TestimonialButton 
                            variant="primary" 
                            className="px-6 py-3"
                        />
                    </div>
                </div>
            </div>
            
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#252528',
                        color: '#C3E88D',
                        border: '1px solid #4A4A4D',
                        fontFamily: "'Fira Code', monospace",
                    },
                }}
            />
        </div>
    </QueryClientProvider>
  );
}