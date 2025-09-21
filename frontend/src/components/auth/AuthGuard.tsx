"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoaded && !userId && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/sign-in');
    }
  }, [isLoaded, userId, router, isRedirecting]);

  if (!isLoaded || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-text-primary font-heading animate-pulse">
          {isRedirecting ? '[REDIRECTING...]' : '[LOADING_SYSTEM...]'}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-text-primary font-heading">
          [ACCESS_DENIED]
        </div>
      </div>
    );
  }

  return <>{children}</>;
}