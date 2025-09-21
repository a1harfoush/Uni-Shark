"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import Header from "@/components/layout/Header";
import BugReportButton from "@/components/ui/BugReportButton";
import { DashboardProvider } from "@/lib/context/DashboardContext";
import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

function AuthStateManager({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const lastUserId = useRef<string | null>(null);
  const wasSignedIn = useRef<boolean | null>(null);
  const hasInitialized = useRef<boolean>(false);

  // Global localStorage cleanup on auth state changes
  useEffect(() => {
    // Skip cleanup on initial load to prevent clearing data on page refresh
    if (!hasInitialized.current) {
      if (user) {
        lastUserId.current = user.id;
        wasSignedIn.current = isSignedIn ?? null;
        hasInitialized.current = true;
        console.log(`Initialized with user: ${user.id}`);
      }
      return;
    }

    // Handle sign out (user was signed in, now not signed in)
    if (wasSignedIn.current === true && !isSignedIn) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('userScrapeData_') || key.startsWith('dashboardData_')) {
          localStorage.removeItem(key);
        }
      });
      console.log("User signed out. Cleared all local data.");
      lastUserId.current = null;
    }

    // Handle actual user switch (different user ID, not just page reload)
    if (user && lastUserId.current && user.id !== lastUserId.current) {
      // Only clear data from OTHER users, not the current user
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('userScrapeData_') && !key.includes(user.id)) {
          localStorage.removeItem(key);
        }
        if (key.startsWith('dashboardData_') && !key.includes(user.id)) {
          localStorage.removeItem(key);
        }
      });
      console.log(`User switched from ${lastUserId.current} to ${user.id}. Cleared other users' data.`);
      lastUserId.current = user.id;
    }

    wasSignedIn.current = isSignedIn ?? null;
  }, [user, isSignedIn]);

  return <>{children}</>;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardProvider>
        <AuthStateManager>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto p-3 md:p-6 lg:p-8 max-w-7xl">
              {children}
            </main>
            
            {/* Floating Bug Report Button */}
            <div className="fixed bottom-6 right-6 z-40">
              <BugReportButton 
                variant="icon" 
                className="shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 transition-shadow"
              />
            </div>
          </div>
        </AuthStateManager>
      </DashboardProvider>
    </AuthGuard>
  );
}