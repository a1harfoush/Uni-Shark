// /frontend/src/lib/hooks/useDashboardData.ts
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDashboard } from "../context/DashboardContext";
import { useState, useEffect, useRef, useCallback } from "react";

// Types to match the backend Pydantic models
interface DashboardStats {
    tasks_today: number;
    tasks_this_week: number;
    tasks_later: number;
    new_absences: number;
    recent_grades: number;
    total_scrapes: number;
    successful_scrapes: number;
}

interface Grade {
    name: string;
    course: string;
    grade: string;
}

interface CourseRegistrationInfo {
    name: string;
    group: string;
    hours: string;
    fees: string;
}

interface DashboardData {
    is_onboarded: boolean;
    stats: DashboardStats;
    last_scrape?: any;
    recent_grades_list: Grade[];
    course_registration?: {
        available_courses: CourseRegistrationInfo[];
        registration_end_date: string;
    };
}

export function useDashboardData() {
    const queryClient = useQueryClient();
    const { getToken, userId } = useAuth();
    const { user } = useUser();
    const { setScanProgress } = useDashboard();
    const [activeTaskId, setActiveTaskId] = useState(null);
    const [scanLogs, setScanLogs] = useState<string[]>([]);
    const lastLogRef = useRef<string>('');

    // Progress simulation state
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    const [currentMessage, setCurrentMessage] = useState("Scanning for targets...");
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // Progress checkpoints with shark hunting themed messages (150 seconds total)
    const progressCheckpoints = [
        { time: 0, percentage: 0, message: "Shark awakening from depths" },
        { time: 5, percentage: 5, message: "Sharpening hunting instincts" },
        { time: 10, percentage: 10, message: "Activating predator senses" },
        { time: 15, percentage: 15, message: "Diving into target waters" },
        { time: 25, percentage: 25, message: "Circling prey territory" },
        { time: 35, percentage: 35, message: "Stalking through digital currents" },
        { time: 50, percentage: 50, message: "Hunting quiz prey in deep waters" },
        { time: 70, percentage: 60, message: "Devouring quiz intelligence" },
        { time: 90, percentage: 70, message: "Tracking assignment scent trails" },
        { time: 110, percentage: 80, message: "Prowling absence hunting grounds" },
        { time: 130, percentage: 90, message: "Feeding on collected data" },
        { time: 145, percentage: 95, message: "Shark returning to command center" },
        { time: 150, percentage: 100, message: "Hunt successful - prey captured" }
    ];

    // Create a stable callback for updating scan progress
    const updateScanProgress = useCallback((progress: { message: string; percentage: number }) => {
        if (setScanProgress) {
            setScanProgress(progress);
        }
    }, [setScanProgress]);

    // Start progress simulation
    const startProgressSimulation = useCallback(() => {
        startTimeRef.current = Date.now();
        setSimulatedProgress(0);
        setCurrentMessage("Shark awakening from depths");
        
        updateScanProgress({
            message: "Shark awakening from depths",
            percentage: 0
        });

        progressIntervalRef.current = setInterval(() => {
            if (!startTimeRef.current) return;
            
            const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
            
            // Handle extended hunt (beyond 150 seconds)
            if (elapsed > 150) {
                // Shark continues prowling - holding pattern messages
                const extendedMessages = [
                    "Shark prowling deeper waters...",
                    "Hunting in uncharted territories...", 
                    "Tracking elusive digital prey...",
                    "Shark persistence mode activated...",
                    "Deep sea hunting continues...",
                    "Shark refuses to give up the hunt..."
                ];
                
                // Cycle through extended messages every 10 seconds
                const messageIndex = Math.floor((elapsed - 150) / 10) % extendedMessages.length;
                const extendedMessage = extendedMessages[messageIndex];
                
                // Keep progress at 95% during extended hunt
                setSimulatedProgress(95);
                setCurrentMessage(extendedMessage);
                
                updateScanProgress({
                    message: extendedMessage,
                    percentage: 95
                });
                return;
            }
            
            // Normal progress (0-150 seconds)
            // Find the current checkpoint
            let currentCheckpoint = progressCheckpoints[0];
            for (const checkpoint of progressCheckpoints) {
                if (elapsed >= checkpoint.time) {
                    currentCheckpoint = checkpoint;
                } else {
                    break;
                }
            }
            
            // Interpolate between checkpoints for smooth progress
            const nextCheckpointIndex = progressCheckpoints.findIndex(cp => cp.time > elapsed);
            if (nextCheckpointIndex > 0) {
                const prevCheckpoint = progressCheckpoints[nextCheckpointIndex - 1];
                const nextCheckpoint = progressCheckpoints[nextCheckpointIndex];
                
                const timeDiff = nextCheckpoint.time - prevCheckpoint.time;
                const progressDiff = nextCheckpoint.percentage - prevCheckpoint.percentage;
                const timeIntoSegment = elapsed - prevCheckpoint.time;
                
                const interpolatedProgress = prevCheckpoint.percentage + 
                    (progressDiff * (timeIntoSegment / timeDiff));
                
                setSimulatedProgress(Math.min(interpolatedProgress, 95)); // Cap at 95% until completion
                setCurrentMessage(prevCheckpoint.message);
                
                updateScanProgress({
                    message: prevCheckpoint.message,
                    percentage: Math.min(interpolatedProgress, 95)
                });
            } else {
                // Use the current checkpoint
                setSimulatedProgress(Math.min(currentCheckpoint.percentage, 95));
                setCurrentMessage(currentCheckpoint.message);
                
                updateScanProgress({
                    message: currentCheckpoint.message,
                    percentage: Math.min(currentCheckpoint.percentage, 95)
                });
            }
        }, 1000); // Update every second
    }, [updateScanProgress]);

    // Complete progress simulation (jump to 100%)
    const completeProgressSimulation = useCallback((success: boolean = true) => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        
        const finalMessage = success ? "Hunt successful - prey captured" : "Shark retreated - hunt failed";
        const finalPercentage = success ? 100 : 0;
        
        setSimulatedProgress(finalPercentage);
        setCurrentMessage(finalMessage);
        
        updateScanProgress({
            message: finalMessage,
            percentage: finalPercentage
        });
    }, [updateScanProgress]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const { data, isLoading, isError, error } = useQuery<DashboardData>({
        queryKey: ["dashboardData", userId],
        queryFn: async () => {
            if (!userId || !user) throw new Error("User not authenticated");
            const token = await getToken();
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch(`/api/dashboard?user_timezone=${encodeURIComponent(userTimezone)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch dashboard data: ${errorText}`);
            }
            const result = await response.json();
            return result;
        },
        enabled: !!userId && !!user,
    });

    // The mutation to START the scan
    const { mutate: runManualScan } = useMutation({
        mutationFn: async () => {
            const token = await getToken();
            const response = await fetch("/api/scrape/run-manual", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to start manual scan: ${await response.text()}`);
            }
            return response.json();
        },
        onSuccess: (data) => {
            setActiveTaskId(data.task_id); // Start polling
            setScanLogs(['> Scan initiated...']);
            startProgressSimulation(); // Start the simulated progress
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`);
        }
    });

    // The query to POLL for status
    const { data: taskStatus } = useQuery({
        queryKey: ['taskStatus', activeTaskId],
        queryFn: async () => {
            if (!activeTaskId) return null;
            const token = await getToken();
            const response = await fetch(`/api/scrape/task-status/${activeTaskId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch task status: ${response.status}`);
            }
            return response.json();
        },
        enabled: !!activeTaskId, // Only poll if there's an active task
        refetchInterval: 2000, // Poll every 2 seconds
    });

    // An effect to process the poll results
    useEffect(() => {
        if (taskStatus) {
            const info = taskStatus.info?.status;
            
            // Update scan logs using ref to prevent duplicates (only for actual backend messages)
            if (info && lastLogRef.current !== `> ${info}`) {
                lastLogRef.current = `> ${info}`;
                setScanLogs(prev => [...prev, `> ${info}`]);
            }

            // Check for terminal states - complete the simulated progress
            if (taskStatus.status === 'SUCCESS' || taskStatus.status === 'FAILURE') {
                const finalMessage = `> Task finished with status: ${taskStatus.status}`;
                if (lastLogRef.current !== finalMessage) {
                    lastLogRef.current = finalMessage;
                    setScanLogs(prev => [...prev, finalMessage]);
                }
                
                // Complete the simulated progress (jump to 100% or 0%)
                completeProgressSimulation(taskStatus.status === 'SUCCESS');
                
                setTimeout(() => {
                    setActiveTaskId(null); // Stop polling
                    setScanLogs([]); // Clear logs
                    lastLogRef.current = ''; // Reset ref
                    startTimeRef.current = null; // Reset start time
                    // Reset progress
                    updateScanProgress({ message: "Shark resting in depths...", percentage: 0 });
                    queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Refresh dashboard
                }, 3000); // Wait 3 seconds before hiding the card
            }
        }
    }, [taskStatus, queryClient, updateScanProgress, completeProgressSimulation]);


    return {
        dashboardData: data,
        isLoading,
        isError,
        error,
        runManualScan,
        isScanning: !!activeTaskId,
        scanLogs,
    };
}
