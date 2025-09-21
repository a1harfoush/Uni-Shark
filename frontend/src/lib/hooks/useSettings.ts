// /frontend/src/lib/hooks/useSettings.ts
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// This should match the Pydantic model in the backend
type UserSettings = {
  dulms_username?: string;
  dulms_password?: string;
  fcb_api_key?: string;
  nopecha_api_key?: string;
  discord_webhook?: string;
  is_automation_active?: boolean;
  check_interval_hours?: number;
  deadline_notifications?: boolean;
  notify_via_email?: boolean;
  notify_via_telegram?: boolean;
  telegram_chat_id?: string;
  deadline_reminder_hours?: number;
};

export function useSettings() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();

  const { data: settings, isLoading, isError } = useQuery<UserSettings>({
    queryKey: ["settings", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      const token = await getToken();
      const response = await fetch("/api/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch settings: ${errorText}`);
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      const token = await getToken();
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Settings saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["settings", userId] });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  return { settings, isLoading, isError, updateSettings, isUpdating };
}