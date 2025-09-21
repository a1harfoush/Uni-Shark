"use client"; // Needed for path checking and UserButton

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDashboard } from "@/lib/context/DashboardContext";

const navItems = [
  { name: "[DASHBOARD]", href: "/dashboard" },
  { name: "[HISTORY]", href: "/history" },
  { name: "[SETTINGS]", href: "/settings" },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isScanning } = useDashboard();

  return (
    <header className="bg-background-secondary/50 border-b border-state-disabled/50 backdrop-blur-sm sticky top-0 z-40">
      <nav className="container mx-auto flex items-center justify-between p-3 md:p-4">
        {/* Left Side: App Logo */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-heading text-sm md:text-lg text-text-heading hover:text-accent-primary transition-colors duration-300">
            UNI SHARK
          </Link>
          {isScanning && (
            <span className="font-heading text-xs text-accent-primary animate-pulse hidden md:inline">
              {'>'} HUNTING...
            </span>
          )}
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden lg:flex items-center gap-4 md:gap-6 font-heading text-xs md:text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  ${isActive ? "text-accent-primary text-shadow-glow-primary" : "text-text-primary"}
                  hover:text-accent-primary hover:text-shadow-glow-primary transition-all duration-300
                `}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-text-primary hover:text-accent-primary transition-colors duration-300"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Right Side: User Button */}
        <div className="border border-state-disabled p-1">
          <UserButton 
            afterSignOutUrl="/" 
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 md:w-10 md:h-10"
              }
            }}
          />
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-background-secondary border-t border-state-disabled">
          <div className="container mx-auto p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    block py-2 font-heading text-sm
                    ${isActive ? "text-accent-primary" : "text-text-primary"}
                    hover:text-accent-primary transition-all duration-300
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}