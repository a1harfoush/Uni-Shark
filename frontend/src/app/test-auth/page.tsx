"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function TestAuthPage() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary p-8">
      <h1 className="font-heading text-2xl mb-6">[AUTH_TEST_PAGE]</h1>
      
      <div className="space-y-4">
        <p>User ID: {userId || 'Not signed in'}</p>
        <p>Status: {userId ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED'}</p>
      </div>

      <div className="mt-8 space-x-4">
        <Link href="/dashboard" className="text-accent-primary hover:underline">
          Go to Dashboard
        </Link>
        <Link href="/sign-in" className="text-accent-primary hover:underline">
          Sign In
        </Link>
        <Link href="/" className="text-accent-primary hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}