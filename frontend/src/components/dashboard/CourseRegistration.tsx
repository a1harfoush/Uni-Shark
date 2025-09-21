// /frontend/src/components/dashboard/CourseRegistration.tsx
"use client";

import { Card } from "@/components/ui/Card";

interface CourseRegistrationInfo {
    name: string;
    group: string;
    hours: string;
    fees: string;
}

interface CourseRegistrationProps {
  registrationInfo?: {
    available_courses: CourseRegistrationInfo[];
    registration_end_date: string;
  };
}

export default function CourseRegistration({ registrationInfo }: CourseRegistrationProps) {
  if (!registrationInfo || !registrationInfo.available_courses || registrationInfo.available_courses.length === 0) {
    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="font-heading text-sm text-text-secondary mb-2">{`// COURSE REGISTRATION`}</h3>
            <div className="flex-grow flex items-center justify-center">
                <p className="text-text-secondary font-mono">No registration data available.</p>
            </div>
        </Card>
    );
  }

  return (
    <Card className="p-4">
        <h3 className="font-heading text-sm text-text-secondary mb-2">{`// COURSE REGISTRATION`}</h3>
        <p className="text-sm text-state-warning mb-4 font-mono">
            Deadline: {new Date(registrationInfo.registration_end_date).toLocaleString()}
        </p>
        <div className="space-y-3 font-mono text-xs max-h-64 overflow-y-auto pr-2">
            {registrationInfo.available_courses.map((course) => (
                <div key={course.name} className="p-2 bg-background-secondary rounded-sm flex flex-col justify-between">
                    <p className="text-text-primary font-bold truncate" title={course.name}>{course.name}</p>
                    <div className="flex justify-between text-text-secondary items-baseline">
                        <span className="truncate pr-2">{course.group} ({course.hours})</span>
                        <span className="flex-shrink-0">{course.fees}</span>
                    </div>
                </div>
            ))}
        </div>
    </Card>
  );
}