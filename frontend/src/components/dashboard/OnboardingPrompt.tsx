// /frontend/src/components/dashboard/OnboardingPrompt.tsx
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function OnboardingPrompt() {
  return (
    <Card className="text-center p-8">
      <div className="font-mono text-5xl text-text-secondary mb-4">?</div>
      <h2 className="font-heading text-xl text-text-heading mb-2">
        CREDENTIALS NOT DETECTED
      </h2>
      <p className="font-body text-text-primary">
        Proceed to{" "}
        <Link href="/settings" className="text-accent-primary hover:underline focus:underline animate-pulse">
          [SETTINGS]
        </Link>
        {" "}to deploy your personal monitoring agent...
      </p>
    </Card>
  );
}