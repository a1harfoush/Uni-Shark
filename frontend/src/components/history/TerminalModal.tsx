// /frontend/src/components/history/TerminalModal.tsx
"use client";

import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useHistoryDetail } from '@/lib/hooks/useHistoryData';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Card } from '../ui/Card';

interface TerminalModalProps {
    scrapeId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

// --- Sub-components for rendering data ---

const QuizItem = ({ item }: { item: any }) => (
    <div className="p-2 bg-background-primary rounded-sm">
        <p className="text-text-primary font-bold" title={item.name}>{item.name}</p>
        <div className="flex justify-between text-text-secondary text-xs">
            <span>{item.course}</span>
            <span className={item.grade === 'Not Graded' ? 'text-state-warning' : 'text-state-success'}>{item.grade}</span>
        </div>
        <p className="text-text-secondary text-xs">Closes: {item.closed_at}</p>
    </div>
);

const AssignmentItem = ({ item }: { item: any }) => (
    <div className="p-2 bg-background-primary rounded-sm">
        <p className="text-text-primary font-bold" title={item.name}>{item.name}</p>
        <p className="text-text-secondary text-xs">{item.course}</p>
        <p className="text-text-secondary text-xs">Closes: {item.closed_at}</p>
    </div>
);

const AbsenceItem = ({ item }: { item: any }) => (
    <div className="p-2 bg-background-primary rounded-sm">
        <p className="text-text-primary font-bold" title={item.course}>{item.course}</p>
        <div className="flex justify-between text-text-secondary text-xs">
            <span>{item.type}</span>
            <span>{item.date}</span>
        </div>
    </div>
);

const RegistrationItem = ({ item }: { item: any }) => (
     <div className="p-2 bg-background-primary rounded-sm">
        <p className="text-text-primary font-bold" title={item.name}>{item.name}</p>
        <div className="flex justify-between text-text-secondary text-xs">
            <span>{item.group} ({item.hours})</span>
            <span>{item.fees}</span>
        </div>
    </div>
);

// --- Main Components ---

const TabTrigger = ({ value, children }: { value: string, children: React.ReactNode }) => (
    <Tabs.Trigger
        value={value}
        className="font-mono px-4 py-2 text-sm text-text-secondary hover:text-text-primary data-[state=active]:text-accent-primary data-[state=active]:bg-background-secondary data-[state=active]:shadow-inner"
    >
        {children}
    </Tabs.Trigger>
);

const TabContent = ({ value, children }: { value: string, children: React.ReactNode }) => (
    <Tabs.Content value={value} className="p-4 bg-background-primary rounded-b-md outline-none">
        <div className="space-y-3 text-xs font-mono">
            {children}
        </div>
    </Tabs.Content>
);


export default function TerminalModal({ scrapeId, isOpen, onClose }: TerminalModalProps) {
    const { data: details, isLoading, isError } = useHistoryDetail(scrapeId);
    const scrapedData = details?.scraped_data;

    const renderContent = (key: string, ItemComponent: React.ElementType) => {
        const items = scrapedData?.[key]?.[key] || (key === 'quizzes' ? scrapedData?.[key]?.['quizzes_without_results'] : []);
        if (!items || items.length === 0) {
            return <p className="text-text-secondary">{'>'} No data for this category.</p>;
        }
        return items.map((item: any, index: number) => <ItemComponent key={index} item={item} />);
    };
    
    const renderRegistration = () => {
        const items = scrapedData?.course_registration?.available_courses;
        if (!items || items.length === 0) {
            return <p className="text-text-secondary">{'>'} No registration data.</p>;
        }
        return items.map((item: any, index: number) => <RegistrationItem key={index} item={item} />);
    };


    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="bg-background-primary/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex flex-col w-full max-w-4xl h-[80vh] -translate-x-1/2 -translate-y-1/2 gap-4 border-2 border-accent-primary/50 bg-background-secondary shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
                    <div className="flex items-center justify-between p-2 border-b border-accent-primary/50 flex-shrink-0">
                        <Dialog.Title className="font-heading text-lg text-text-heading">
                            // SCRAPE_LOG_ID: {scrapeId}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-text-secondary hover:text-accent-primary" aria-label="Close">
                                <Cross2Icon />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="p-4 overflow-y-auto">
                        {isLoading && <p className="font-mono text-text-secondary animate-pulse">{'>'} Loading details...</p>}
                        {isError && <p className="font-mono text-state-error">{'>'} Error loading details.</p>}
                        {details && (
                            <Tabs.Root defaultValue="quizzes">
                                <Tabs.List className="flex border-b border-accent-primary/50 sticky top-0 bg-background-secondary z-10">
                                    <TabTrigger value="quizzes">[Quizzes]</TabTrigger>
                                    <TabTrigger value="assignments">[Assignments]</TabTrigger>
                                    <TabTrigger value="absences">[Absences]</TabTrigger>
                                    <TabTrigger value="registration">[Registration]</TabTrigger>
                                    <TabTrigger value="log">[Raw Log]</TabTrigger>
                                </Tabs.List>
                                <TabContent value="quizzes">{renderContent('quizzes', QuizItem)}</TabContent>
                                <TabContent value="assignments">{renderContent('assignments', AssignmentItem)}</TabContent>
                                <TabContent value="absences">{renderContent('absences', AbsenceItem)}</TabContent>
                                <TabContent value="registration">{renderRegistration()}</TabContent>
                                <TabContent value="log">
                                    <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(scrapedData, null, 2)}</pre>
                                </TabContent>
                            </Tabs.Root>
                        )}
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}