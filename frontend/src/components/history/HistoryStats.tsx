// /frontend/src/components/history/HistoryStats.tsx
"use client";

import { useAllHistoryData } from "@/lib/hooks/useHistoryData";
import { useLocalScrapeData } from "@/lib/hooks/useLocalScrapeData";
import { Card } from "@/components/ui/Card";
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { cn } from "@/lib/utils";
import React from "react";

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Accordion.Trigger>>(({ children, className, ...props }, ref) => (
  <Accordion.Header className="flex">
    <Accordion.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-3 font-heading text-lg text-text-heading transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </Accordion.Trigger>
  </Accordion.Header>
));
AccordionTrigger.displayName = Accordion.Trigger.displayName

const AccordionContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Accordion.Content>>(({ children, className, ...props }, ref) => (
  <Accordion.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </Accordion.Content>
));
AccordionContent.displayName = Accordion.Content.displayName

export default function HistoryStats() {
    const { data: remoteData, isLoading } = useAllHistoryData();
    const localData = useLocalScrapeData(remoteData);

    if (isLoading || !localData) {
        return (
            <Card className="p-4 mb-8">
                <p className="text-center animate-pulse">Loading lifetime stats...</p>
            </Card>
        );
    }

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    };

    return (
        <Card className="p-4 mb-8">
            <h2 className="font-heading text-xl text-text-heading mb-4 text-center">// LIFETIME DATA ARCHIVE</h2>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-3 bg-background-secondary/50 rounded">
                    <p className="font-mono text-2xl text-accent-primary">{localData.courses?.length ?? 0}</p>
                    <p className="text-xs text-text-secondary">Total Courses</p>
                </div>
                <div className="p-3 bg-background-secondary/50 rounded">
                    <p className="font-mono text-2xl text-accent-primary">{localData.quizzes?.length ?? 0}</p>
                    <p className="text-xs text-text-secondary">Total Quizzes</p>
                </div>
                <div className="p-3 bg-background-secondary/50 rounded">
                    <p className="font-mono text-2xl text-accent-primary">{localData.assignments?.length ?? 0}</p>
                    <p className="text-xs text-text-secondary">Total Assignments</p>
                </div>
            </div>

            {localData.lastUpdated && (
                <p className="text-xs text-text-secondary text-center mb-4">
                    Last updated: {formatDate(localData.lastUpdated)} | Total scrapes: {localData.totalScrapes || 0}
                </p>
            )}

            <Accordion.Root type="multiple" className="w-full">
                <Accordion.Item value="courses">
                    <AccordionTrigger>// Courses ({localData.courses?.length ?? 0})</AccordionTrigger>
                    <AccordionContent>
                        <div className="max-h-64 overflow-y-auto">
                            <ul className="list-disc list-inside font-mono text-xs text-text-secondary space-y-1">
                                {localData.courses?.map((course: string, index: number) => (
                                    <li key={`${course}-${index}`}>{course}</li>
                                ))}
                            </ul>
                        </div>
                    </AccordionContent>
                </Accordion.Item>
                
                <Accordion.Item value="quizzes">
                    <AccordionTrigger>// Quizzes ({localData.quizzes?.length ?? 0})</AccordionTrigger>
                    <AccordionContent>
                        <div className="max-h-64 overflow-y-auto">
                            <ul className="list-disc list-inside font-mono text-xs text-text-secondary space-y-1">
                                {localData.quizzes?.map((quiz: any, index: number) => (
                                    <li key={`${quiz.name}-${quiz.course}-${index}`}>
                                        <span className="text-accent-primary">{quiz.course}</span>: {quiz.name}
                                        {quiz.grade && <span className="text-state-success ml-2">({quiz.grade})</span>}
                                        {quiz.closed_at && <span className="text-text-secondary ml-2">- Due: {quiz.closed_at}</span>}
                                        {quiz.firstSeen && <span className="text-text-secondary ml-2">- Added: {formatDate(quiz.firstSeen)}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AccordionContent>
                </Accordion.Item>
                
                <Accordion.Item value="assignments">
                    <AccordionTrigger>// Assignments ({localData.assignments?.length ?? 0})</AccordionTrigger>
                    <AccordionContent>
                        <div className="max-h-64 overflow-y-auto">
                            <ul className="list-disc list-inside font-mono text-xs text-text-secondary space-y-1">
                                {localData.assignments?.map((assignment: any, index: number) => (
                                    <li key={`${assignment.name}-${assignment.course}-${index}`}>
                                        <span className="text-accent-primary">{assignment.course}</span>: {assignment.name}
                                        {assignment.grade && <span className="text-state-success ml-2">({assignment.grade})</span>}
                                        {assignment.closed_at && <span className="text-text-secondary ml-2">- Due: {assignment.closed_at}</span>}
                                        {assignment.firstSeen && <span className="text-text-secondary ml-2">- Added: {formatDate(assignment.firstSeen)}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AccordionContent>
                </Accordion.Item>

                {localData.grades && localData.grades.length > 0 && (
                    <Accordion.Item value="grades">
                        <AccordionTrigger>// Grades ({localData.grades?.length ?? 0})</AccordionTrigger>
                        <AccordionContent>
                            <div className="max-h-64 overflow-y-auto">
                                <ul className="list-disc list-inside font-mono text-xs text-text-secondary space-y-1">
                                    {localData.grades?.map((grade: any, index: number) => (
                                        <li key={`${grade.name}-${grade.course}-${index}`}>
                                            <span className="text-accent-primary">{grade.course}</span>: {grade.name}
                                            <span className="text-state-success ml-2">- {grade.grade}</span>
                                            {grade.firstSeen && <span className="text-text-secondary ml-2">- Added: {formatDate(grade.firstSeen)}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AccordionContent>
                    </Accordion.Item>
                )}
            </Accordion.Root>
        </Card>
    );
}