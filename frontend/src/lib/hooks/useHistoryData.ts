// /frontend/src/lib/hooks/useHistoryData.ts
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

// Types to match backend models
export interface HistoryItem {
    id: string;
    scraped_at: string; // Comes as string
    status: string;
    new_items_found: number;
    log_message?: string;
}

export interface HistoryDetail {
    scraped_data: any;
}

export interface AllData {
    courses: string[];
    quizzes: any[];
    assignments: any[];
    absences: any[];
}

export interface OverallStats {
    total_courses: number;
    total_quizzes: number;
    total_assignments: number;
}

// Hook to fetch the list of all history items
export function useHistoryList() {
    const { getToken, userId } = useAuth();
    return useQuery<HistoryItem[]>({
        queryKey: ["historyList", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User not authenticated");
            const token = await getToken();
            const response = await fetch("/api/history", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch history list");
            }
            return response.json();
        },
        enabled: !!userId,
    });
}

// Hook to fetch the overall stats
export function useHistoryStats() {
    const { getToken, userId } = useAuth();
    return useQuery<OverallStats>({
        queryKey: ["historyStats", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User not authenticated");
            const token = await getToken();
            const response = await fetch("/api/history/stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch history stats");
            }
            return response.json();
        },
        enabled: !!userId,
    });
}

// Hook to fetch all consolidated data for the stats accordion
export function useAllHistoryData() {
    const { getToken, userId } = useAuth();
    return useQuery<AllData>({
        queryKey: ["allHistoryData", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User not authenticated");
            const token = await getToken();
            const response = await fetch("/api/history/get-all-data-archive", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch all history data");
            }
            return response.json();
        },
        enabled: !!userId,
    });
}

// Hook to fetch the details of a single history item
export function useHistoryDetail(scrapeId: string | null) {
    const { getToken, userId } = useAuth();
    return useQuery<HistoryDetail>({
        queryKey: ["historyDetail", userId, scrapeId],
        queryFn: async () => {
            if (!scrapeId || !userId) return null; // Don't fetch if no ID or user is provided
            const token = await getToken();
            const response = await fetch(`/api/history/${scrapeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch history detail for ${scrapeId}`);
            }
            return response.json();
        },
        enabled: !!scrapeId && !!userId, // Only run this query if scrapeId and userId are not null
    });
}