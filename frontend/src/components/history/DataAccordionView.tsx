// /frontend/src/components/history/DataAccordionView.tsx
"use client";

import { Card } from "@/components/ui/Card";
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { extractAllCourses } from "@/lib/data-processing";

// Define interfaces for our data structures for type safety
interface Quiz {
    course: string;
    name: string;
    grade?: string;
    closed_at?: string;
}

interface Assignment {
    course: string;
    name: string;
    submission_status?: string;
    grading_status?: string;
    closed_at?: string;
    grade?: string;
}

interface DataAccordionViewProps {
    selectedScrapeData: any;
    isLoading?: boolean;
    showingCachedData?: boolean;
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Accordion.Trigger>>(({ children, className, ...props }, ref) => (
  <Accordion.Header className="flex">
    <Accordion.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-3 md:py-4 font-heading text-sm md:text-base lg:text-lg text-accent-primary transition-all hover:text-text-heading [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </Accordion.Trigger>
  </Accordion.Header>
));
AccordionTrigger.displayName = Accordion.Trigger.displayName;

const AccordionContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Accordion.Content>>(({ children, className, ...props }, ref) => (
  <Accordion.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </Accordion.Content>
));
AccordionContent.displayName = Accordion.Content.displayName;

const DataTable = ({ columns, data, emptyMessage }: { columns: string[], data: any[], emptyMessage: string }) => {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-text-secondary font-mono">
                <span className="text-accent-primary">{'>'}</span> {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
                <thead>
                    <tr className="border-b border-accent-primary/30">
                        {columns.map((col) => (
                            <th key={col} className="text-left py-2 px-3 text-accent-primary font-heading">
                                {col.toUpperCase()}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index} className="border-b border-background-secondary/50 hover:bg-background-secondary/30">
                            {columns.map((col) => (
                                <td key={col} className="py-2 px-3 text-text-primary">
                                    {item[col.toLowerCase().replace(' ', '_')] || '-'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function DataAccordionView({ selectedScrapeData, isLoading, showingCachedData = false }: DataAccordionViewProps) {
    const [openSections, setOpenSections] = useState<string[]>(['courses']);

    if (isLoading) {
        return (
            <Card className="p-6 mb-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-background-secondary rounded w-1/3"></div>
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 bg-background-secondary rounded"></div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    if (!selectedScrapeData) {
        return (
            <Card className="p-6 mb-8 text-center">
                <p className="font-mono text-text-secondary">
                    <span className="text-accent-primary">{'>'}</span> Select a scrape from the log below to view detailed data
                </p>
            </Card>
        );
    }

    // Process data for display
    const courses = extractAllCourses(selectedScrapeData);
    
    const quizzes = [
        ...(selectedScrapeData.quizzes?.quizzes_with_results || []),
        ...(selectedScrapeData.quizzes?.quizzes_without_results || [])
    ].map((quiz: Quiz) => ({
        course: quiz.course,
        name: quiz.name,
        status: quiz.grade ? 'Graded' : 'Not Graded',
        grade: quiz.grade || '-',
        due_date: quiz.closed_at || '-'
    }));

    const assignments = (selectedScrapeData.assignments?.assignments || []).map((assignment: Assignment) => ({
        course: assignment.course,
        name: assignment.name,
        submission_status: assignment.submission_status || '-',
        grading_status: assignment.grading_status || '-',
        due_date: assignment.closed_at || '-'
    }));

    const grades = [
        ...(selectedScrapeData.quizzes?.quizzes_with_results || []),
        ...(selectedScrapeData.assignments?.assignments || [])
    ].filter((item: Quiz | Assignment) => item.grade).map((item: Quiz | Assignment) => ({
        course: item.course,
        name: item.name,
        grade: item.grade,
        type: 'submission_status' in item ? 'Assignment' : 'Quiz' // Differentiate by a unique property
    }));

    return (
        <Card className="p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
            <div className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
            
            <div className="mb-4 md:mb-6">
                <h2 className="font-heading text-base md:text-lg lg:text-xl text-accent-primary mb-2"
                    style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                    {`> MISSION_DATA_ANALYSIS`}
                </h2>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-accent-primary">{'>'}</span>
                    <span className="text-text-secondary font-mono">
                        {showingCachedData 
                            ? "Displaying aggregated data from all missions" 
                            : "Displaying data from selected mission log"
                        }
                    </span>
                    {!showingCachedData && (
                        <span className="text-accent-primary font-mono text-xs ml-2 animate-pulse">
                            [SPECIFIC_MISSION_DATA]
                        </span>
                    )}
                </div>
            </div>

            <Accordion.Root type="multiple" value={openSections} onValueChange={setOpenSections} className="w-full">
                <Accordion.Item value="courses" className="border-b border-accent-primary/20">
                    <AccordionTrigger>
                        {`// COURSES_DETECTED (${courses.length})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {courses.length > 0 ? courses.map((course: string, index: number) => (
                                <div key={index} className="p-2 bg-background-secondary/30 rounded border border-accent-primary/10">
                                    <span className="font-mono text-sm text-text-primary">{course}</span>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-4 text-text-secondary font-mono">
                                    <span className="text-accent-primary">{'>'}</span> No courses detected in this scan
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </Accordion.Item>

                <Accordion.Item value="quizzes" className="border-b border-accent-primary/20">
                    <AccordionTrigger>
                        {`// QUIZ_ANALYSIS (${quizzes.length})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        <DataTable 
                            columns={['Course', 'Name', 'Status', 'Grade', 'Due Date']}
                            data={quizzes}
                            emptyMessage="No quizzes found in this scan"
                        />
                    </AccordionContent>
                </Accordion.Item>

                <Accordion.Item value="assignments" className="border-b border-accent-primary/20">
                    <AccordionTrigger>
                        {`// ASSIGNMENT_ANALYSIS (${assignments.length})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        <DataTable 
                            columns={['Course', 'Name', 'Submission Status', 'Grading Status', 'Due Date']}
                            data={assignments}
                            emptyMessage="No assignments found in this scan"
                        />
                    </AccordionContent>
                </Accordion.Item>

                {grades.length > 0 && (
                    <Accordion.Item value="grades" className="border-b border-accent-primary/20">
                        <AccordionTrigger>
                            {`// GRADE_SUMMARY (${grades.length})`}
                        </AccordionTrigger>
                        <AccordionContent>
                            <DataTable 
                                columns={['Course', 'Name', 'Grade', 'Type']}
                                data={grades}
                                emptyMessage="No grades found in this scan"
                            />
                        </AccordionContent>
                    </Accordion.Item>
                )}

                {/* Add Absences Section */}
                <Accordion.Item value="absences" className="border-b border-accent-primary/20">
                    <AccordionTrigger>
                        {`// ABSENCE_ANALYSIS (${selectedScrapeData?.absences?.absences?.length || 0})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        {selectedScrapeData?.absences?.absences?.length > 0 ? (
                            <DataTable 
                                columns={['Course', 'Date', 'Type', 'Status']}
                                data={selectedScrapeData.absences.absences.map((absence: any) => ({
                                    course: absence.course || '-',
                                    date: absence.date || '-',
                                    type: absence.type || '-',
                                    status: absence.status || 'Recorded'
                                }))}
                                emptyMessage="No absences found in this scan"
                            />
                        ) : (
                            <div className="text-center py-8 text-text-secondary font-mono">
                                <span className="text-accent-primary">{'>'}</span> No absences detected in this scan
                            </div>
                        )}
                    </AccordionContent>
                </Accordion.Item>
            </Accordion.Root>
        </Card>
    );
}