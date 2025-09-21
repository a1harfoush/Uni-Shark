// /frontend/src/components/dashboard/RecentGrades.tsx
"use client";

import { Card } from "@/components/ui/Card";

interface Grade {
    name: string;
    course: string;
    grade: string;
}

interface RecentGradesProps {
  grades: Grade[];
}

export default function RecentGrades({ grades }: RecentGradesProps) {
  if (grades.length === 0) {
    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="font-heading text-sm text-text-secondary mb-2">{`// RECENTLY GRADED`}</h3>
            <div className="flex-grow flex items-center justify-center">
                <p className="text-text-secondary font-mono">No recent grades found.</p>
            </div>
        </Card>
    );
  }

  return (
    <Card className="p-4">
        <h3 className="font-heading text-sm text-text-secondary mb-2">{`// RECENTLY GRADED`}</h3>
        <div className="space-y-2 font-mono text-sm">
            {grades.map((item, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 items-center">
                    <p className="text-text-primary col-span-2 truncate" title={item.course}>{item.course}</p>
                    <p className="text-accent-secondary text-right">{item.grade}</p>
                    <p className="text-text-secondary col-span-3 text-xs" title={item.name}>{item.name}</p>
                </div>
            ))}
        </div>
    </Card>
  );
}