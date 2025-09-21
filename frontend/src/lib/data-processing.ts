// /frontend/src/lib/data-processing.ts

// Type definitions for processed data
export interface ProcessedNotification {
  id: string;
  type: 'absence' | 'quiz' | 'assignment' | 'course';
  title: string;
  course?: string;
  details?: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  isNew?: boolean;
}

export interface UpcomingTarget {
  id: string;
  type: 'quiz' | 'assignment';
  name: string;
  course: string;
  dueDate?: string;
  timeRemaining: string;
  urgencyLevel: 'critical' | 'warning' | 'normal';
}

export interface ProcessedAbsence {
  id: string;
  date: string;
  course: string;
  type: string;
  status: string;
  formattedDate: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ArchiveStats {
  totalCourses: number;
  totalQuizzes: number;
  totalAssignments: number;
  totalAbsences: number;
  totalGrades: number;
  lastUpdated: string;
  dataIntegrity: number;
  operationalStatus: 'operational' | 'warning' | 'error';
}

/**
 * Extracts a unique set of course names from all possible sources within a raw scrape data object.
 * @param data - The raw scrape data object.
 * @returns An array of unique course names.
 */
export const extractAllCourses = (data: any): string[] => {
  if (!data) return [];

  const courses = new Set<string>();

  // From quizzes
  if (data.quizzes?.quizzes_with_results) {
    data.quizzes.quizzes_with_results.forEach((q: any) => q.course && courses.add(q.course));
  }
  if (data.quizzes?.quizzes_without_results) {
    data.quizzes.quizzes_without_results.forEach((q: any) => q.course && courses.add(q.course));
  }
  if (data.quizzes?.courses_found_on_page) {
    data.quizzes.courses_found_on_page.forEach((course: string) => courses.add(course));
  }

  // From assignments
  if (data.assignments?.assignments) {
    data.assignments.assignments.forEach((a: any) => a.course && courses.add(a.course));
  }
  if (data.assignments?.courses_found_on_page) {
    data.assignments.courses_found_on_page.forEach((course: string) => courses.add(course));
  }

  // From course registration data
  if (data.course_registration?.available_courses) {
    data.course_registration.available_courses.forEach((c: any) => c.name && courses.add(c.name));
  }

  // From absences
  if (data.absences?.absences) {
    data.absences.absences.forEach((a: any) => a.course && courses.add(a.course));
  }

  return Array.from(courses).filter(name => name && name !== "Unknown Course");
};

/**
 * Validates scraped data structure to ensure it has the expected format
 * @param data - Raw scraped data
 * @returns boolean indicating if data is valid
 */
export const validateScrapedData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  // Check for expected top-level structure
  const hasValidStructure =
    data.hasOwnProperty('quizzes') ||
    data.hasOwnProperty('assignments') ||
    data.hasOwnProperty('absences') ||
    data.hasOwnProperty('course_registration');

  return hasValidStructure;
};

/**
 * Sanitizes data for display by handling missing or malformed fields
 * @param item - Data item to sanitize
 * @param requiredFields - Array of required field names
 * @returns Sanitized data item
 */
export const sanitizeDataForDisplay = (item: any, requiredFields: string[] = []): any => {
  if (!item || typeof item !== 'object') return {};

  const sanitized = { ...item };

  // Ensure required fields exist with fallback values
  requiredFields.forEach(field => {
    if (!sanitized[field]) {
      switch (field) {
        case 'name':
        case 'title':
          sanitized[field] = 'Unknown';
          break;
        case 'course':
          sanitized[field] = 'Unknown Course';
          break;
        case 'date':
        case 'timestamp':
          sanitized[field] = new Date().toISOString();
          break;
        case 'type':
          sanitized[field] = 'unknown';
          break;
        default:
          sanitized[field] = '';
      }
    }
  });

  return sanitized;
};

/**
 * Calculates notification priority based on data type and content
 * @param item - Notification item
 * @param type - Type of notification
 * @returns Priority level
 */
export const calculateNotificationPriority = (item: any, type: string): 'high' | 'medium' | 'low' => {
  switch (type) {
    case 'absence':
      return 'high'; // Absences are always high priority
    case 'assignment':
      // Check if assignment has a due date soon
      if (item.closed_at || item.due_date) {
        const dueDate = new Date(item.closed_at || item.due_date);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) return 'high';
        if (diffDays <= 3) return 'medium';
      }
      return 'medium';
    case 'quiz':
      // Similar logic for quizzes
      if (item.closed_at || item.due_date) {
        const dueDate = new Date(item.closed_at || item.due_date);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) return 'high';
        if (diffDays <= 3) return 'medium';
      }
      return 'medium';
    case 'grade':
      return 'medium';
    case 'course':
      return 'low';
    default:
      return 'low';
  }
};

/**
 * Transforms raw scraped data into structured notification objects
 * @param localData - Local storage data with merged information OR comprehensive history data
 * @param dashboardData - Dashboard data from API
 * @returns Array of processed notifications
 */
export const transformScrapedDataToNotifications = (localData: any, dashboardData: any): ProcessedNotification[] => {
  const notifications: ProcessedNotification[] = [];

  if (!localData && !dashboardData) return notifications;

  // Process absences - prioritize dashboard data (most recent) to avoid duplicates
  const absences = dashboardData?.last_scrape?.absences?.absences || localData?.absences || [];

  absences.forEach((absence: any, index: number) => {
    const sanitized = sanitizeDataForDisplay(absence, ['course', 'date', 'type']);
    notifications.push({
      id: `absence-${sanitized.course}-${sanitized.date}-${index}`,
      type: 'absence',
      title: `Absence in ${sanitized.course}`,
      course: sanitized.course,
      details: `${sanitized.type} - ${sanitized.status || 'Recorded'}`,
      timestamp: sanitized.lastUpdated || sanitized.firstSeen || sanitized.date || new Date().toISOString(),
      priority: calculateNotificationPriority(sanitized, 'absence'),
      isNew: sanitized.lastUpdated && new Date(sanitized.lastUpdated).getTime() > Date.now() - 24 * 60 * 60 * 1000
    });
  });

  // Process assignments - prioritize dashboard data (most recent) to avoid duplicates
  const assignments = dashboardData?.last_scrape?.assignments?.assignments || localData?.assignments || [];

  assignments.forEach((assignment: any, index: number) => {
    const sanitized = sanitizeDataForDisplay(assignment, ['name', 'course']);
    // Use processed date fields for better priority calculation
    const dueDate = assignment.closed_at_parsed || assignment.closed_at || assignment.due_date;
    const displayDate = assignment.closed_at_display || assignment.closed_at || assignment.due_date;
    
    // Create a proper timestamp for sorting - use firstSeen/lastUpdated if available, otherwise use due date, then current time
    let timestamp = sanitized.lastUpdated || sanitized.firstSeen || dueDate;
    
    // Validate timestamp before using it
    if (timestamp) {
      const testDate = new Date(timestamp);
      if (isNaN(testDate.getTime())) {
        console.warn(`Invalid timestamp detected for assignment ${sanitized.name}: ${timestamp}`);
        timestamp = new Date().toISOString();
      }
    } else {
      timestamp = new Date().toISOString();
    }
    
    notifications.push({
      id: `assignment-${sanitized.name}-${sanitized.course}-${index}`,
      type: 'assignment',
      title: sanitized.name,
      course: sanitized.course,
      details: `${sanitized.submit_status || sanitized.submission_status || sanitized.grading_status || 'Not Submitted'}${displayDate ? ` - Due: ${displayDate}` : ''}`,
      timestamp,
      priority: calculateNotificationPriority({ ...sanitized, closed_at: dueDate }, 'assignment'),
      isNew: sanitized.lastUpdated && new Date(sanitized.lastUpdated).getTime() > Date.now() - 24 * 60 * 60 * 1000
    });
  });

  // Process quizzes - handle both dashboard data structure and local data
  let quizzes: any[] = [];
  
  // Get quizzes from dashboard data (new structure)
  if (dashboardData?.last_scrape?.quizzes) {
    quizzes = [
      ...(dashboardData.last_scrape.quizzes.quizzes_with_results || []),
      ...(dashboardData.last_scrape.quizzes.quizzes_without_results || [])
    ];
  } else if (localData?.quizzes) {
    // Fallback to local data (flat array structure)
    quizzes = localData.quizzes;
  }

  quizzes.forEach((quiz: any, index: number) => {
    const sanitized = sanitizeDataForDisplay(quiz, ['name', 'course']);
    
    // Create a proper timestamp for sorting - use firstSeen/lastUpdated if available, otherwise use quiz date, then current time
    const quizDate = quiz.closed_at_parsed || quiz.closed_at || quiz.due_date;
    let timestamp = sanitized.lastUpdated || sanitized.firstSeen || quizDate;
    
    // Validate timestamp before using it
    if (timestamp) {
      const testDate = new Date(timestamp);
      if (isNaN(testDate.getTime())) {
        console.warn(`Invalid timestamp detected for quiz ${sanitized.name}: ${timestamp}`);
        timestamp = new Date().toISOString();
      }
    } else {
      timestamp = new Date().toISOString();
    }
    
    notifications.push({
      id: `quiz-${sanitized.name}-${sanitized.course}-${index}`,
      type: 'quiz',
      title: sanitized.name,
      course: sanitized.course,
      details: sanitized.grade && sanitized.grade !== 'Not Graded' ? `Grade: ${sanitized.grade}` : 'Quiz available',
      timestamp,
      priority: calculateNotificationPriority(sanitized, 'quiz'),
      isNew: sanitized.lastUpdated && new Date(sanitized.lastUpdated).getTime() > Date.now() - 24 * 60 * 60 * 1000
    });
  });

  // Process courses - handle both comprehensive history data and local data structures
  const courses = [
    ...(localData?.courses || []), // This now includes comprehensive history data
    ...(dashboardData?.last_scrape?.quizzes?.courses_found_on_page || []),
    ...(dashboardData?.last_scrape?.assignments?.courses_found_on_page || [])
  ];

  // Get unique courses and take the most recent ones
  const uniqueCourses = Array.from(new Set(courses.filter(course => 
    course && course !== 'Unknown Course' && typeof course === 'string'
  )));

  uniqueCourses.slice(-3).forEach((courseName: string, index: number) => {
    notifications.push({
      id: `course-${courseName}-${index}`,
      type: 'course',
      title: courseName,
      details: 'Course detected',
      timestamp: new Date().toISOString(),
      priority: calculateNotificationPriority({}, 'course')
    });
  });

  // Sort by timestamp (most recent first) and limit to 15
  const sortedNotifications = notifications
    .filter(n => {
      // Filter out notifications with invalid timestamps
      const timestamp = new Date(n.timestamp);
      const isValid = !isNaN(timestamp.getTime());
      if (!isValid) {
        console.warn(`[NOTIFICATIONS] Filtering out notification with invalid timestamp: ${n.timestamp}`, n);
      }
      return isValid;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Most recent first
    })
    .slice(0, 15);

  console.log('[NOTIFICATIONS DEBUG] Sorted notifications:', sortedNotifications.map(n => ({ 
    type: n.type, 
    title: n.title, 
    timestamp: n.timestamp,
    parsedTime: new Date(n.timestamp).toISOString()
  })));

  return sortedNotifications;
};

/**
 * Calculates time remaining until a due date
 * @param dueDate - Due date string
 * @returns Formatted time remaining string
 */
export const calculateTimeRemaining = (dueDate: string): string => {
  if (!dueDate) return 'No deadline';

  try {
    const now = new Date();
    const deadline = parseFlexibleDate(dueDate);
    if (!deadline) return 'Invalid date';

    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) return 'Overdue';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Parses date strings in various formats including processed backend dates
 * @param dateString - Date string to parse
 * @returns Date object or null if parsing fails
 */
export const parseFlexibleDate = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;

  try {
    // Handle ISO format from backend processing (preferred)
    if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-'))) {
      // Ensure proper timezone handling for ISO dates
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        // Validate the date is reasonable (not too far in past/future)
        const now = new Date();
        const yearDiff = Math.abs(parsed.getFullYear() - now.getFullYear());
        if (yearDiff > 10) {
          console.warn(`Date seems unreasonable: ${dateString} -> ${parsed}`);
          return null;
        }
        return parsed;
      }
    }

    // Handle format like "Jul 20, 2025 at 09:30 PM"
    if (dateString.includes(' at ')) {
      const cleanedDate = dateString.replace(' at ', ' ');
      const parsed = new Date(cleanedDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // Handle relative time format "Will be closed after: X days, Y hours"
    if (dateString.includes('Will be closed after:')) {
      const now = new Date();
      const daysMatch = dateString.match(/(\d+)\s*days?/);
      const hoursMatch = dateString.match(/(\d+)\s*hours?/);
      const minutesMatch = dateString.match(/(\d+)\s*minutes?/);
      
      const days = daysMatch ? parseInt(daysMatch[1]) : 0;
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      
      const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000));
      return futureDate;
    }

    // Handle format like "Fri, 18/07/2025"
    if (dateString.includes(',') && dateString.includes('/')) {
      const parts = dateString.split(', ')[1]?.split('/');
      if (parts && parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        // Create a proper date string: MM/DD/YYYY
        const properDateString = `${month}/${day}/${year}`;
        const parsed = new Date(properDateString);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    // Try standard Date parsing
    const standardParsed = new Date(dateString);
    if (!isNaN(standardParsed.getTime())) return standardParsed;

    return null;
  } catch (error) {
    console.warn('Date parsing error:', error, 'for date:', dateString);
    return null;
  }
};

/**
 * Checks if a date is within a specified timeframe
 * @param date - Date string to check
 * @param days - Number of days to check within
 * @returns Boolean indicating if date is within timeframe
 */
export const isWithinTimeframe = (date: string, days: number): boolean => {
  if (!date) return false;

  try {
    // Use UTC for consistent timezone handling
    const now = new Date();
    const targetDate = parseFlexibleDate(date);
    if (!targetDate) {
      console.warn('Failed to parse date:', date);
      return false;
    }

    const diffMs = targetDate.getTime() - now.getTime();
    const timeframeMs = days * 24 * 60 * 60 * 1000;

    // Only show items that are due in the future within the timeframe
    // Remove overdue items from "Upcoming Targets" to avoid confusion
    const isWithinFuture = diffMs > 0 && diffMs <= timeframeMs;
    
    // console.log(`[TIMEFRAME DEBUG] Date: ${date}, diffMs: ${diffMs}, diffDays: ${diffMs / (24 * 60 * 60 * 1000)}, isWithinFuture: ${isWithinFuture}`);
    
    return isWithinFuture;
  } catch (error) {
    console.error('isWithinTimeframe error:', error, 'for date:', date);
    return false;
  }
};

/**
 * Checks if a date is overdue (past deadline)
 * @param date - Date string to check
 * @param graceDays - Number of days grace period to consider (default: 7)
 * @returns Boolean indicating if date is overdue within grace period
 */
export const isOverdue = (date: string, graceDays: number = 7): boolean => {
  if (!date) return false;

  try {
    const now = new Date();
    const targetDate = parseFlexibleDate(date);
    if (!targetDate) return false;

    const diffMs = targetDate.getTime() - now.getTime();
    const overdueGraceMs = graceDays * 24 * 60 * 60 * 1000;

    // Item is overdue if deadline has passed but within grace period
    return diffMs >= -overdueGraceMs && diffMs <= 0;
  } catch (error) {
    console.error('isOverdue error:', error, 'for date:', date);
    return false;
  }
};

/**
 * Determines urgency level based on time remaining
 * @param timeRemaining - Time remaining in milliseconds
 * @returns Urgency level
 */
export const determineUrgencyLevel = (timeRemaining: number): 'critical' | 'warning' | 'normal' => {
  const days = timeRemaining / (1000 * 60 * 60 * 24);

  if (days <= 1) return 'critical';
  if (days <= 3) return 'warning';
  return 'normal';
};

/**
 * Filters and processes upcoming targets (assignments and quizzes due within specified days)
 * @param localData - Local storage data OR comprehensive history data
 * @param dashboardData - Dashboard data from API
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @returns Array of upcoming targets
 */
export const filterUpcomingTargets = (localData: any, dashboardData: any, daysAhead: number = 7): UpcomingTarget[] => {
  console.log('[FILTER START] filterUpcomingTargets called');
  
  const targets: UpcomingTarget[] = [];
  const seenTargets = new Set<string>(); // Track duplicates

  // Use dashboard data first (most recent), then fall back to local data
  const assignments = dashboardData?.last_scrape?.assignments?.assignments || localData?.assignments || [];
  
  console.log('[FILTER START] assignments found:', assignments?.length || 0);

  assignments.forEach((assignment: any, index: number) => {
    if (!assignment) return;

    // Create unique identifier to avoid duplicates
    const uniqueId = `assignment-${assignment.name}-${assignment.course}`;
    if (seenTargets.has(uniqueId)) return;
    seenTargets.add(uniqueId);

    // Prioritize processed date fields from backend
    const dueDate = assignment.closed_at_parsed || assignment.closed_at || assignment.due_date;
    const displayDate = assignment.closed_at_display;
    const relativeTime = assignment.closed_at_relative;
    
    // Only show future tasks - exclude overdue items from "Upcoming Targets"
    const withinTimeframe = isWithinTimeframe(dueDate, daysAhead);
    const isFutureTask = relativeTime && relativeTime.includes('In');
    const shouldShow = withinTimeframe || isFutureTask;
    
    // Debug logging to see what's happening
    console.log(`[FILTER DEBUG] ${assignment.name}:`);
    console.log(`  dueDate: ${dueDate}`);
    console.log(`  displayDate: ${displayDate}`);
    console.log(`  relativeTime: ${relativeTime}`);
    console.log(`  withinTimeframe: ${withinTimeframe}`);
    console.log(`  isFutureTask: ${isFutureTask}`);
    console.log(`  shouldShow: ${shouldShow}`);
    
    if (dueDate && shouldShow) {
      const sanitized = sanitizeDataForDisplay(assignment, ['name', 'course']);
      const timeRemaining = relativeTime || calculateTimeRemaining(dueDate);
      const parsedDate = parseFlexibleDate(dueDate);
      const diffMs = parsedDate ? parsedDate.getTime() - new Date().getTime() : 0;

      // Use processed display date from backend (preferred)
      let finalDisplayDate = displayDate; // This should be closed_at_display from backend
      if (!finalDisplayDate && parsedDate) {
        // Fallback: format the parsed date nicely
        finalDisplayDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      // Last resort: use original date but clean it up
      if (!finalDisplayDate) {
        finalDisplayDate = assignment.closed_at;
      }

      targets.push({
        id: `assignment-target-${sanitized.name}-${sanitized.course}-${index}`,
        type: 'assignment',
        name: sanitized.name,
        course: sanitized.course,
        dueDate: finalDisplayDate,
        timeRemaining,
        urgencyLevel: determineUrgencyLevel(diffMs)
      });
    }
  });

  // Process quizzes - handle both dashboard data structure and local data
  let quizzes: any[] = [];
  
  // Get quizzes from dashboard data (new structure)
  if (dashboardData?.last_scrape?.quizzes) {
    const dashboardQuizzes = [
      ...(dashboardData.last_scrape.quizzes.quizzes_without_results || []),
      ...(dashboardData.last_scrape.quizzes.quizzes_with_results || [])
    ];
    quizzes = dashboardQuizzes;
    console.log('[FILTER DEBUG] Using dashboard quizzes:', quizzes.length);
  } else if (localData?.quizzes) {
    // Fallback to local data (flat array structure)
    quizzes = localData.quizzes;
    console.log('[FILTER DEBUG] Using local quizzes:', quizzes.length);
  }

  quizzes.forEach((quiz: any, index: number) => {
    if (!quiz) return;

    // Create unique identifier to avoid duplicates
    const uniqueId = `quiz-${quiz.name}-${quiz.course}`;
    if (seenTargets.has(uniqueId)) return;
    seenTargets.add(uniqueId);

    // Prioritize processed date fields from backend
    const dueDate = quiz.closed_at_parsed || quiz.closed_at || quiz.due_date;
    const displayDate = quiz.closed_at_display;
    const relativeTime = quiz.closed_at_relative;

    // Skip quizzes that are "Will be opened at" since they're not due dates
    if (quiz.closed_at && quiz.closed_at.includes('Will be opened at')) {
      console.log(`[FILTER DEBUG] Skipping quiz ${quiz.name} - not a due date (opening date)`);
      return;
    }

    // Only show future tasks - exclude overdue items from "Upcoming Targets"
    const withinTimeframe = isWithinTimeframe(dueDate, daysAhead);
    const isFutureTask = relativeTime && relativeTime.includes('In');
    const shouldShow = withinTimeframe || isFutureTask;

    console.log(`[FILTER DEBUG] Quiz ${quiz.name}:`);
    console.log(`  dueDate: ${dueDate}`);
    console.log(`  relativeTime: ${relativeTime}`);
    console.log(`  withinTimeframe: ${withinTimeframe}`);
    console.log(`  isFutureTask: ${isFutureTask}`);
    console.log(`  shouldShow: ${shouldShow}`);

    if (dueDate && shouldShow) {
      const sanitized = sanitizeDataForDisplay(quiz, ['name', 'course']);
      const timeRemaining = relativeTime || calculateTimeRemaining(dueDate);
      const parsedDate = parseFlexibleDate(dueDate);
      const diffMs = parsedDate ? parsedDate.getTime() - new Date().getTime() : 0;

      // Use processed display date from backend (preferred)
      let finalDisplayDate = displayDate;
      if (!finalDisplayDate && parsedDate) {
        finalDisplayDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      if (!finalDisplayDate) {
        finalDisplayDate = quiz.closed_at;
      }

      targets.push({
        id: `quiz-target-${sanitized.name}-${sanitized.course}-${index}`,
        type: 'quiz',
        name: sanitized.name,
        course: sanitized.course,
        dueDate: finalDisplayDate,
        timeRemaining,
        urgencyLevel: determineUrgencyLevel(diffMs)
      });
    }
  });

  console.log('[FILTER END] Total targets found:', targets.length);
  console.log('[FILTER END] Targets:', targets.map(t => ({ name: t.name, course: t.course, dueDate: t.dueDate, timeRemaining: t.timeRemaining })));

  // Sort by parsed due date (earliest first) and limit to 5
  return targets
    .sort((a, b) => {
      const dateA = parseFlexibleDate(a.dueDate || '');
      const dateB = parseFlexibleDate(b.dueDate || '');
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);
};

/**
 * Filters and processes overdue targets (assignments and quizzes past their deadline)
 * @param localData - Local storage data OR comprehensive history data
 * @param dashboardData - Dashboard data from API
 * @param graceDays - Number of days grace period to show overdue items (default: 7)
 * @returns Array of overdue targets
 */
export const filterOverdueTargets = (localData: any, dashboardData: any, graceDays: number = 7): UpcomingTarget[] => {
  console.log('[OVERDUE FILTER START] filterOverdueTargets called');
  
  const targets: UpcomingTarget[] = [];
  const seenTargets = new Set<string>(); // Track duplicates

  // Use dashboard data first (most recent), then fall back to local data
  const assignments = dashboardData?.last_scrape?.assignments?.assignments || localData?.assignments || [];
  
  assignments.forEach((assignment: any, index: number) => {
    if (!assignment) return;

    // Create unique identifier to avoid duplicates
    const uniqueId = `assignment-${assignment.name}-${assignment.course}`;
    if (seenTargets.has(uniqueId)) return;
    seenTargets.add(uniqueId);

    // Prioritize processed date fields from backend
    const dueDate = assignment.closed_at_parsed || assignment.closed_at || assignment.due_date;
    const displayDate = assignment.closed_at_display;
    const relativeTime = assignment.closed_at_relative;
    
    // Check if task is overdue within grace period
    const isOverdueTask = isOverdue(dueDate, graceDays);
    const isOverdueByRelativeTime = relativeTime && (relativeTime.includes('ago') || relativeTime.includes('Overdue'));
    const shouldShow = isOverdueTask || isOverdueByRelativeTime;
    
    if (dueDate && shouldShow) {
      const sanitized = sanitizeDataForDisplay(assignment, ['name', 'course']);
      const timeRemaining = relativeTime || calculateTimeRemaining(dueDate);
      const parsedDate = parseFlexibleDate(dueDate);
      const diffMs = parsedDate ? parsedDate.getTime() - new Date().getTime() : 0;

      // Use processed display date from backend (preferred)
      let finalDisplayDate = displayDate;
      if (!finalDisplayDate && parsedDate) {
        finalDisplayDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      if (!finalDisplayDate) {
        finalDisplayDate = assignment.closed_at;
      }

      targets.push({
        id: `overdue-assignment-${sanitized.name}-${sanitized.course}-${index}`,
        type: 'assignment',
        name: sanitized.name,
        course: sanitized.course,
        dueDate: finalDisplayDate,
        timeRemaining,
        urgencyLevel: 'critical' // All overdue items are critical
      });
    }
  });

  // Process quizzes
  let quizzes: any[] = [];
  
  if (dashboardData?.last_scrape?.quizzes) {
    quizzes = [
      ...(dashboardData.last_scrape.quizzes.quizzes_without_results || []),
      ...(dashboardData.last_scrape.quizzes.quizzes_with_results || [])
    ];
  } else if (localData?.quizzes) {
    quizzes = localData.quizzes;
  }

  quizzes.forEach((quiz: any, index: number) => {
    if (!quiz) return;

    // Create unique identifier to avoid duplicates
    const uniqueId = `quiz-${quiz.name}-${quiz.course}`;
    if (seenTargets.has(uniqueId)) return;
    seenTargets.add(uniqueId);

    // Prioritize processed date fields from backend
    const dueDate = quiz.closed_at_parsed || quiz.closed_at || quiz.due_date;
    const displayDate = quiz.closed_at_display;
    const relativeTime = quiz.closed_at_relative;

    // Skip quizzes that are "Will be opened at" since they're not due dates
    if (quiz.closed_at && quiz.closed_at.includes('Will be opened at')) {
      return;
    }

    // Check if task is overdue within grace period
    const isOverdueTask = isOverdue(dueDate, graceDays);
    const isOverdueByRelativeTime = relativeTime && (relativeTime.includes('ago') || relativeTime.includes('Overdue'));
    const shouldShow = isOverdueTask || isOverdueByRelativeTime;

    if (dueDate && shouldShow) {
      const sanitized = sanitizeDataForDisplay(quiz, ['name', 'course']);
      const timeRemaining = relativeTime || calculateTimeRemaining(dueDate);
      const parsedDate = parseFlexibleDate(dueDate);
      const diffMs = parsedDate ? parsedDate.getTime() - new Date().getTime() : 0;

      // Use processed display date from backend (preferred)
      let finalDisplayDate = displayDate;
      if (!finalDisplayDate && parsedDate) {
        finalDisplayDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      if (!finalDisplayDate) {
        finalDisplayDate = quiz.closed_at;
      }

      targets.push({
        id: `overdue-quiz-${sanitized.name}-${sanitized.course}-${index}`,
        type: 'quiz',
        name: sanitized.name,
        course: sanitized.course,
        dueDate: finalDisplayDate,
        timeRemaining,
        urgencyLevel: 'critical' // All overdue items are critical
      });
    }
  });

  console.log('[OVERDUE FILTER END] Total overdue targets found:', targets.length);

  // Sort by how overdue they are (most recently overdue first)
  return targets
    .sort((a, b) => {
      const dateA = parseFlexibleDate(a.dueDate || '');
      const dateB = parseFlexibleDate(b.dueDate || '');
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime(); // Most recently overdue first
    })
    .slice(0, 5);
};

/**
 * Processes absence data for display in the Absence Tracker
 * @param localData - Local storage data
 * @param dashboardData - Dashboard data from API
 * @returns Array of processed absences
 */
export const processAbsenceData = (localData: any, dashboardData: any): ProcessedAbsence[] => {
  const absences = [
    ...(dashboardData?.last_scrape?.absences?.absences || []),
    ...(localData?.absences || [])
  ];

  return absences
    .map((absence: any, index: number) => {
      const sanitized = sanitizeDataForDisplay(absence, ['course', 'date', 'type']);

      return {
        id: `processed-absence-${sanitized.course}-${sanitized.date}-${index}`,
        date: sanitized.date,
        course: sanitized.course,
        type: sanitized.type,
        status: sanitized.status || 'Absence',
        formattedDate: formatRelativeDate(sanitized.date),
        priority: calculateNotificationPriority(sanitized, 'absence')
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10); // Limit to 10 most recent
};

/**
 * Formats a date string to a relative format
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export const formatRelativeDate = (dateString: string): string => {
  if (!dateString) return 'Unknown date';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Filters targets due today (within 24 hours)
 * @param localData - Local storage data OR comprehensive history data
 * @param dashboardData - Dashboard data from API
 * @returns Number of targets due today
 */
export const filterTargetsToday = (localData: any, dashboardData: any): number => {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999); // End of today

  let todayCount = 0;
  const seenItems = new Set<string>(); // Track duplicates

  // Check assignments - prioritize dashboard data
  const assignments = dashboardData?.last_scrape?.assignments?.assignments || localData?.assignments || [];

  assignments.forEach((assignment: any) => {
    const uniqueId = `assignment-${assignment.name}-${assignment.course}`;
    if (seenItems.has(uniqueId)) return;
    seenItems.add(uniqueId);

    // Prioritize processed date fields from backend
    const dueDate = assignment.closed_at_parsed || assignment.closed_at || assignment.due_date;
    if (dueDate) {
      const parsedDate = parseFlexibleDate(dueDate);
      if (parsedDate && parsedDate.getTime() <= todayEnd.getTime() && parsedDate.getTime() > now.getTime()) {
        todayCount++;
      }
    }
  });

  // Check quizzes - handle both dashboard data structure and local data
  let quizzes: any[] = [];
  
  if (dashboardData?.last_scrape?.quizzes) {
    quizzes = [
      ...(dashboardData.last_scrape.quizzes.quizzes_without_results || []),
      ...(dashboardData.last_scrape.quizzes.quizzes_with_results || [])
    ];
  } else if (localData?.quizzes) {
    quizzes = localData.quizzes;
  }

  quizzes.forEach((quiz: any) => {
    const uniqueId = `quiz-${quiz.name}-${quiz.course}`;
    if (seenItems.has(uniqueId)) return;
    seenItems.add(uniqueId);

    // Prioritize processed date fields from backend
    const dueDate = quiz.closed_at_parsed || quiz.closed_at || quiz.due_date;
    if (dueDate) {
      const parsedDate = parseFlexibleDate(dueDate);
      if (parsedDate && parsedDate.getTime() <= todayEnd.getTime() && parsedDate.getTime() > now.getTime()) {
        todayCount++;
      }
    }
  });

  return todayCount;
};

/**
 * Calculates comprehensive archive statistics
 * @param localData - Local storage data
 * @param dashboardData - Dashboard data from API
 * @returns Archive statistics object
 */
export const calculateArchiveStatistics = (localData: any, dashboardData: any): ArchiveStats => {
  const courses = extractAllCourses(dashboardData?.last_scrape) || localData?.courses || [];
  const quizzes = [
    ...(dashboardData?.last_scrape?.quizzes?.quizzes_with_results || []),
    ...(dashboardData?.last_scrape?.quizzes?.quizzes_without_results || []),
    ...(localData?.quizzes || [])
  ];
  const assignments = [
    ...(dashboardData?.last_scrape?.assignments?.assignments || []),
    ...(localData?.assignments || [])
  ];
  const absences = [
    ...(dashboardData?.last_scrape?.absences?.absences || []),
    ...(localData?.absences || [])
  ];
  const grades = localData?.grades || [];

  const totalScrapes = localData?.totalScrapes || 0;
  const successfulScrapes = totalScrapes; // Assume all stored scrapes were successful
  const dataIntegrity = totalScrapes > 0 ? Math.round((successfulScrapes / totalScrapes) * 100) : 100;

  let operationalStatus: 'operational' | 'warning' | 'error' = 'operational';
  if (dataIntegrity < 80) operationalStatus = 'error';
  else if (dataIntegrity < 95) operationalStatus = 'warning';

  return {
    totalCourses: courses.length,
    totalQuizzes: quizzes.length,
    totalAssignments: assignments.length,
    totalAbsences: absences.length,
    totalGrades: grades.length,
    lastUpdated: localData?.lastUpdated || dashboardData?.last_scrape?.scraped_at || new Date().toISOString(),
    dataIntegrity,
    operationalStatus
  };
};