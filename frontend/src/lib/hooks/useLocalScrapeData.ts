import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const getLocalKey = (userId: string) => `userScrapeData_${userId}`;

import { extractAllCourses } from "@/lib/data-processing";

export function mergeScrapeData(oldData: any, newData: any) {
  // Enhanced merge logic for comprehensive data tracking
  const merged = {
    ...oldData,
    lastUpdated: new Date().toISOString(),
    totalScrapes: (oldData.totalScrapes || 0) + 1
  };

  const oldCourses = oldData.courses || [];
  const newCourses = extractAllCourses(newData);
  merged.courses = Array.from(new Set([...oldCourses, ...newCourses]));

  // Enhanced merge function with metadata tracking
  function mergeByKey(
    oldArr: any[] = [],
    newArr: any[] = [],
    keyFn: (item: any) => string,
    type: string
  ) {
    const map = new Map(oldArr.map((item: any) => [keyFn(item), { ...item, firstSeen: item.firstSeen || new Date().toISOString() }]));
    let newItemsCount = 0;
    
    for (const item of newArr) {
      const key = keyFn(item);
      const existingItem = map.get(key);
      
      if (!existingItem) {
        newItemsCount++;
        map.set(
          key,
          {
            ...(typeof item === "object" && item !== null ? item : {}),
            firstSeen: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        );
      } else {
        // Update existing item but preserve firstSeen
        map.set(
          key,
          {
            ...existingItem,
            ...item,
            lastUpdated: new Date().toISOString()
          }
        );
      }
    }
    
    merged[`new${type}Count`] = newItemsCount;
    return Array.from(map.values());
  }

  // Merge quizzes (both with and without results)
  const allOldQuizzes = [
    ...(oldData.quizzes || [])
  ];
  const allNewQuizzes = [
    ...(newData.quizzes?.quizzes_with_results || []),
    ...(newData.quizzes?.quizzes_without_results || [])
  ];
  merged.quizzes = mergeByKey(allOldQuizzes, allNewQuizzes, (q) => `${q.name || 'unknown'}_${q.course || 'unknown'}`, 'Quizzes');

  // Merge assignments
  merged.assignments = mergeByKey(
    oldData.assignments || [], 
    newData.assignments?.assignments || [], 
    (a) => `${a.name || 'unknown'}_${a.course || 'unknown'}`, 
    'Assignments'
  );

  // Merge grades (from quizzes with results)
  const oldGrades = oldData.grades || [];
  const newGrades = newData.quizzes?.quizzes_with_results || [];
  merged.grades = mergeByKey(
    oldGrades, 
    newGrades, 
    (g) => `${g.name || 'unknown'}_${g.course || 'unknown'}`, 
    'Grades'
  );

  // Merge absences
  merged.absences = mergeByKey(
    oldData.absences || [], 
    newData.absences?.absences || [], 
    (a) => `${a.course || 'unknown'}_${a.date || 'unknown'}_${a.type || 'unknown'}`, 
    'Absences'
  );

  // Always take the course_registration from the latest scrape, as it's not historical data
  if (newData.course_registration) {
    merged.course_registration = newData.course_registration;
  }

  // Store raw data for debugging
  merged.rawData = merged.rawData || [];
  merged.rawData.push({
    timestamp: new Date().toISOString(),
    data: newData,
    summary: {
      quizzes_with_results: newData.quizzes?.quizzes_with_results?.length || 0,
      quizzes_without_results: newData.quizzes?.quizzes_without_results?.length || 0,
      assignments: newData.assignments?.assignments?.length || 0,
      absences: newData.absences?.absences?.length || 0,
      courses_from_quizzes: newData.quizzes?.courses_found_on_page?.length || 0,
      courses_from_assignments: newData.assignments?.courses_found_on_page?.length || 0
    }
  });

  // Keep only last 5 raw data entries to prevent storage bloat
  if (merged.rawData.length > 5) {
    merged.rawData = merged.rawData.slice(-5);
  }

  // Debug logging
  console.log('Merge operation details:', {
    oldDataKeys: Object.keys(oldData),
    newDataKeys: Object.keys(newData),
    mergedKeys: Object.keys(merged),
    coursesCount: merged.courses?.length,
    quizzesCount: merged.quizzes?.length,
    assignmentsCount: merged.assignments?.length,
    gradesCount: merged.grades?.length,
    absencesCount: merged.absences?.length
  });

  return merged;
}

export function useLocalScrapeData(remoteData: any) {
  const { userId } = useAuth();
  const [localData, setLocalData] = useState<any>(() => {
    // Initialize state from localStorage on mount
    if (typeof window === 'undefined' || !userId) return null;
    const userKey = getLocalKey(userId);
    const stored = localStorage.getItem(userKey);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    // This effect runs when new remote data arrives.
    // It merges the new data with the existing local data.
    if (!remoteData || !userId) return;

    // Get the most recent version from storage, or start fresh
    const userKey = getLocalKey(userId);
    const stored = localStorage.getItem(userKey);
    const oldData = stored ? JSON.parse(stored) : {};

    // --- HEAVY DEBUGGING ---
    console.log("--- TRIGGERING LOCAL DATA MERGE ---");
    console.log("1. OLD DATA FROM STORAGE:", JSON.stringify(oldData, null, 2));
    console.log("2. NEW REMOTE DATA RECEIVED:", JSON.stringify(remoteData, null, 2));
    // --- END DEBUGGING ---
    
    // Create a unique identifier for this scrape data to prevent duplicate processing
    const scrapeId = JSON.stringify(remoteData).slice(0, 50); // Simple hash
    if (oldData.lastProcessedScrapeId === scrapeId) {
      // This data has already been processed, don't merge again
      console.log('Skipping duplicate scrape data processing');
      return;
    }
    
    // Extract scraped data from the wrapper if it exists
    const scrapedData = remoteData.scraped_data || remoteData;
    
    console.log('Processing new scrape data:', {
      scrapeId,
      hasQuizzes: !!scrapedData.quizzes,
      hasAssignments: !!scrapedData.assignments,
      hasAbsences: !!scrapedData.absences,
      quizzesWithResults: scrapedData.quizzes?.quizzes_with_results?.length || 0,
      quizzesWithoutResults: scrapedData.quizzes?.quizzes_without_results?.length || 0,
      assignments: scrapedData.assignments?.assignments?.length || 0,
      absences: scrapedData.absences?.absences?.length || 0
    });
    
    const merged = mergeScrapeData(oldData, scrapedData);
    merged.lastProcessedScrapeId = scrapeId;
    
    // Update both the component state and localStorage
    setLocalData(merged);
    localStorage.setItem(userKey, JSON.stringify(merged));
    
    console.log('Local storage updated with new scrape data:', {
      oldCount: {
        courses: oldData.courses?.length || 0,
        quizzes: oldData.quizzes?.length || 0,
        assignments: oldData.assignments?.length || 0,
        absences: oldData.absences?.length || 0
      },
      newCount: {
        courses: merged.courses?.length || 0,
        quizzes: merged.quizzes?.length || 0,
        assignments: merged.assignments?.length || 0,
        absences: merged.absences?.length || 0
      }
    });

  }, [remoteData, userId]); // Dependency on remoteData and userId ensures this runs when new data is fetched

  // Clear local data when user changes
  useEffect(() => {
    if (!userId) {
      setLocalData(null);
      return;
    }
    
    // Load data for the current user
    const userKey = getLocalKey(userId);
    const stored = localStorage.getItem(userKey);
    setLocalData(stored ? JSON.parse(stored) : null);
  }, [userId]);

  return localData;
}