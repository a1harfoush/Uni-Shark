// Utility to clean up localStorage when switching users
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

export function useUserSpecificLocalStorage() {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    // Clean up any old localStorage entries that don't belong to current user
    const currentUserKey = `userScrapeData_${userId}`;
    
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // Find all userScrapeData keys
    const userDataKeys = allKeys.filter(key => key.startsWith('userScrapeData_'));
    
    // Log current user's data
    console.log(`Current user: ${userId}`);
    console.log(`User-specific localStorage key: ${currentUserKey}`);
    console.log(`Found ${userDataKeys.length} user data entries in localStorage`);
    
    // Clean up old entries from other users to prevent data bleed
    userDataKeys.forEach(key => {
      if (key !== currentUserKey) {
        console.log(`Cleaning up old localStorage entry: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
  }, [userId]);
}