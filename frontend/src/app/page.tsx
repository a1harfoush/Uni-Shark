import ActivityLog from "@/components/landing/ActivityLog";
import StatsPanel from "@/components/landing/StatsPanel";
import GlobeVisual from "@/components/landing/GlobeVisual";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full grid-background text-text-primary p-4 lg:p-8 flex flex-col relative">
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 18, 18, 0.5) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px'
        }}
      />
      
      {/* Header */}
      <header className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center mb-4">
          <div className="font-heading text-6xl md:text-8xl text-text-heading animate-flicker"
               style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.5)' }}>
            UNI SHARK
          </div>
        </div>
        <h2 className="font-heading text-lg text-text-secondary mt-2">
          // GLOBAL MONITORING FEED <span className="animate-pulse text-state-success">[LIVE]</span>
        </h2>
      </header>

      {/* Priority CTA Section - Mobile First */}
      <div className="text-center mb-8 lg:hidden relative z-10">
        <div className="space-y-4">
          <h1 className="font-heading text-xl text-accent-primary animate-flicker" 
              style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
            &gt; UNLEASH THE SHARK
          </h1>
          <p className="text-text-secondary font-body text-sm px-4">
            Stop hunting for updates manually. Unleash your personal Shark to track assignments, grades, and absences 24/7.
          </p>
          <Link href="/dashboard" className="inline-block">
            <Button 
              variant="primary" 
              className="font-heading text-sm px-8 py-3 hover:shadow-glow-primary transition-all duration-200 animate-flicker"
            >
              &gt; ACCESS TERMINAL
            </Button>
          </Link>
          <div className="text-xs text-text-secondary font-mono">
            // SHARK NETWORK READY FOR DEPLOYMENT
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8 relative z-10">
        {/* Left Panel - Activity Log */}
        <div className="hidden lg:block">
          <ActivityLog />
        </div>

        {/* Center Panel - Globe and CTA */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center text-center space-y-6 lg:space-y-8 p-4">
          {/* Globe Visual */}
          <div className="relative w-48 h-48 lg:w-64 lg:h-64 flex items-center justify-center">
            <div className="absolute w-full h-full border-2 border-accent-primary rounded-full opacity-30 animate-pulse-slow"></div>
            <div className="absolute w-3/4 h-3/4 border border-text-secondary rounded-full opacity-50"></div>
            <div className="absolute w-1/2 h-1/2 border border-accent-primary rounded-full animate-spin" 
                 style={{ 
                   transform: 'rotate(113deg)', 
                   background: 'conic-gradient(from 0deg, transparent 0deg, rgba(137, 221, 255, 0.3) 90deg, transparent 180deg)',
                   animationDuration: '20s'
                 }}>
              <div className="absolute top-0 left-1/2 w-2 h-2 bg-accent-primary rounded-full transform -translate-x-1/2 -translate-y-1 animate-pulse-slow"></div>
              <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-state-success rounded-full transform -translate-x-1/2 translate-y-1 animate-pulse-slow" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute left-0 top-1/2 w-2 h-2 bg-state-warning rounded-full transform -translate-x-1 -translate-y-1/2 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
              <div className="absolute right-0 top-1/2 w-2 h-2 bg-state-error rounded-full transform translate-x-1 -translate-y-1/2 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
            </div>
            <div className="absolute w-16 h-16 bg-background-secondary border-2 border-accent-primary rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-accent-primary rounded-full animate-pulse-slow"></div>
            </div>
            <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-70 animate-spin" 
                 style={{ transform: 'rotate(226deg)', animationDuration: '15s' }}></div>
            <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-state-success to-transparent opacity-50 animate-spin" 
                 style={{ transform: 'rotate(-169.5deg)', animationDuration: '25s', animationDirection: 'reverse' }}></div>
            
            {/* Floating data points with staggered animation */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * Math.PI) / 4;
              const radius = 30;
              const top = 50 + Math.sin(angle) * radius;
              const left = 50 + Math.cos(angle) * radius;
              return (
                <div key={i} className="absolute w-1 h-1 bg-text-primary rounded-full animate-pulse" 
                     style={{ 
                       top: `${top}%`, 
                       left: `${left}%`,
                       animationDelay: `${i * 0.2}s`
                     }}></div>
              );
            })}
            
            {/* Floating data indicators - Hidden on mobile */}
            <div className="absolute -top-4 -left-4 text-xs text-accent-primary font-mono animate-pulse hidden sm:block">
              NODE_001
            </div>
            <div className="absolute -top-4 -right-4 text-xs text-state-success font-mono animate-pulse hidden sm:block">
              ACTIVE
            </div>
            <div className="absolute -bottom-4 -left-4 text-xs text-state-warning font-mono animate-pulse hidden sm:block">
              SCAN_RATE: 2.3Hz
            </div>
            <div className="absolute -bottom-4 -right-4 text-xs text-text-secondary font-mono animate-pulse hidden sm:block">
              UPLINK: 99.7%
            </div>
          </div>
          
          {/* CTA Section - Desktop Only */}
          <div className="space-y-6 hidden lg:block">
            <h1 className="font-heading text-2xl md:text-3xl text-accent-primary animate-flicker"
                style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
              &gt; UNLEASH THE SHARK
            </h1>
            <p className="max-w-md mx-auto text-text-secondary font-body">
              Stop hunting for updates manually. Unleash your personal Shark to track assignments, grades, and absences 24/7.
            </p>
            <div className="space-y-4">
              <Link href="/dashboard" className="inline-block">
                <Button 
                  variant="primary" 
                  className="font-heading text-sm px-8 py-3 hover:shadow-glow-primary transition-all duration-200 animate-flicker"
                >
                  &gt; ACCESS TERMINAL
                </Button>
              </Link>
              <div className="text-xs text-text-secondary font-mono">
                // SHARK NETWORK READY FOR DEPLOYMENT
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Stats */}
        <div className="hidden lg:block">
          <StatsPanel />
        </div>
      </main>

      {/* Mobile Activity Log */}
      <div className="lg:hidden mt-8 relative z-10">
        <ActivityLog />
      </div>

      {/* Footer Status Bar */}
      <footer className="mt-8 text-center relative z-10">
        <div className="font-heading text-xs text-text-secondary">
          UNI_SHARK_v4.2.1 | 
          <span className="text-state-success mx-2">CORE_ONLINE</span> | 
          SHARKS_DEPLOYED: <span className="text-accent-primary">1,337</span>
        </div>
      </footer>
    </div>
  );
}
