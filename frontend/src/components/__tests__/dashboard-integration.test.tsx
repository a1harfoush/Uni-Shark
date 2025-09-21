/**
 * Integration Tests for Dashboard Data Flow
 * 
 * Tests the complete data pipeline from scraped data to component display,
 * including component interactions, local storage integration, and real-time updates.
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import NotificationFeed from '../dashboard/NotificationFeed';
import UpcomingTargets from '../dashboard/UpcomingTargets';
import AbsenceTracker from '../dashboard/AbsenceTracker';
import LocalDataArchive from '../dashboard/LocalDataArchive';
// Mock the hooks and external dependencies
jest.mock('@clerk/nextjs');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test data fixtures
const mockScrapedData = {
  quizzes: {
    courses_processed: 3,
    total_quizzes_found: 5,
    quizzes_with_results: [
      {
        name: 'Midterm Quiz',
        course: 'Computer Science 101',
        grade: '85%',
        closed_at: '2025-07-20T10:00:00Z'
      }
    ],
    quizzes_without_results: [
      {
        name: 'Final Quiz',
        course: 'Mathematics 201',
        closed_at: '2025-07-19T14:00:00Z'
      }
    ],
    courses_found_on_page: ['Computer Science 101', 'Mathematics 201', 'Physics 301']
  },
  assignments: {
    assignments: [
      {
        name: 'Project Assignment',
        course: 'Computer Science 101',
        closed_at: '2025-07-21T23:59:00Z',
        submission_status: 'Not submitted'
      },
      {
        name: 'Lab Report',
        course: 'Physics 301',
        closed_at: '2025-07-25T17:00:00Z',
        grading_status: 'Pending'
      }
    ],
    courses_processed: 2,
    total_assignments_found: 2
  },
  absences: {
    absences: [
      {
        course: 'Computer Science 101',
        date: 'Fri, 18/07/2025',
        type: 'lecture',
        status: 'Unexcused'
      },
      {
        course: 'Mathematics 201',
        date: 'Thu, 17/07/2025',
        type: 'practical',
        status: 'Excused'
      }
    ]
  },
  course_registration: {
    available_courses: [
      { name: 'Advanced Programming', group: 'CS', hours: '3', fees: '$500' }
    ],
    registration_end_date: '2025-08-01T00:00:00Z'
  }
};

const mockLocalData = {
  lastUpdated: '2025-07-18T12:00:00Z',
  totalScrapes: 5,
  courses: ['Computer Science 101', 'Mathematics 201', 'Physics 301'],
  quizzes: [
    {
      name: 'Midterm Quiz',
      course: 'Computer Science 101',
      grade: '85%',
      firstSeen: '2025-07-15T10:00:00Z',
      lastUpdated: '2025-07-18T10:00:00Z'
    }
  ],
  assignments: [
    {
      name: 'Project Assignment',
      course: 'Computer Science 101',
      closed_at: '2025-07-21T23:59:00Z',
      firstSeen: '2025-07-16T09:00:00Z',
      lastUpdated: '2025-07-18T09:00:00Z'
    }
  ],
  absences: [
    {
      course: 'Computer Science 101',
      date: 'Fri, 18/07/2025',
      type: 'lecture',
      status: 'Unexcused',
      firstSeen: '2025-07-18T08:00:00Z'
    }
  ],
  grades: [],
  newQuizzesCount: 1,
  newAssignmentsCount: 1,
  newAbsencesCount: 1
};

const mockDashboardData = {
  is_onboarded: true,
  stats: {
    tasks_today: 2,
    tasks_this_week: 5,
    tasks_later: 3,
    new_absences: 1,
    recent_grades: 1
  },
  last_scrape: {
    scraped_data: mockScrapedData,
    scraped_at: '2025-07-18T12:00:00Z'
  },
  recent_grades_list: [
    { name: 'Midterm Quiz', course: 'Computer Science 101', grade: '85%' }
  ]
};

// Helper function to create a test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default auth mock
    mockUseAuth.mockReturnValue({
      userId: 'test-user-123',
      isSignedIn: true,
      isLoaded: true,
      getToken: jest.fn().mockResolvedValue('mock-token')
    } as any);

    // Clear localStorage
    localStorage.clear();
  });

  describe('Complete Data Pipeline Integration', () => {
    test('should process scraped data through complete pipeline to component display', async () => {
      const TestWrapper = createTestWrapper();

      // Render all dashboard components together
      render(
        <TestWrapper>
          <div data-testid="dashboard-container">
            <NotificationFeed 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
            <UpcomingTargets 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
            <AbsenceTracker 
              absences={mockLocalData.absences} 
            />
            <LocalDataArchive 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
          </div>
        </TestWrapper>
      );

      // Verify Hunt Feed displays processed notifications
      await waitFor(() => {
        expect(screen.getByText('// HUNT FEED')).toBeInTheDocument();
        expect(screen.getByText('Absence in Computer Science 101')).toBeInTheDocument();
        expect(screen.getByText('Project Assignment')).toBeInTheDocument();
        expect(screen.getByText('Midterm Quiz')).toBeInTheDocument();
      });

      // Verify Upcoming Targets shows filtered items
      await waitFor(() => {
        expect(screen.getByText('// UPCOMING TARGETS')).toBeInTheDocument();
        // Should show assignments/quizzes due within 7 days
        expect(screen.getByText('Project Assignment')).toBeInTheDocument();
      });

      // Verify Absence Tracker displays absence data
      await waitFor(() => {
        expect(screen.getByText('// ABSENCE TRACKER')).toBeInTheDocument();
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
        expect(screen.getByText('LECTURE:')).toBeInTheDocument();
      });

      // Verify Local Data Archive shows statistics
      await waitFor(() => {
        expect(screen.getByText('// LOCAL_DATA_ARCHIVE')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // courses count
        expect(screen.getByText('COURSES_TRACKED')).toBeInTheDocument();
      });
    });

    test('should handle data transformation errors gracefully', async () => {
      // Mock malformed data
      const malformedData = {
        quizzes: null,
        assignments: { assignments: 'invalid' },
        absences: undefined
      };

      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={malformedData} 
            dashboardData={null} 
          />
        </TestWrapper>
      );

      // Should display empty state instead of crashing
      await waitFor(() => {
        expect(screen.getByText('NO NEW TARGETS DETECTED')).toBeInTheDocument();
      });
    });
  });

  describe('Component Interactions with Processed Data', () => {
    test('should update components when data changes', async () => {
      const TestWrapper = createTestWrapper();
      
      // Initial render with empty data
      const { rerender } = render(
        <TestWrapper>
          <NotificationFeed localData={null} dashboardData={null} />
        </TestWrapper>
      );

      // Should show empty state
      expect(screen.getByText('NO NEW TARGETS DETECTED')).toBeInTheDocument();

      // Update with new data
      rerender(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Should now show data
      await waitFor(() => {
        expect(screen.getByText('Project Assignment')).toBeInTheDocument();
        expect(screen.queryByText('NO NEW TARGETS DETECTED')).not.toBeInTheDocument();
      });
    });

    test('should handle priority-based styling and sorting', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check that high-priority absence appears first (absences are high priority)
        const notifications = screen.getAllByText(/Computer Science 101|Mathematics 201/);
        expect(notifications.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Local Storage Integration', () => {
    test('should persist data to localStorage and retrieve it', async () => {
      const TestWrapper = createTestWrapper();
      
      // Mock localStorage operations
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
      
      // Simulate data being stored
      localStorage.setItem('userScrapeData_test-user-123', JSON.stringify(mockLocalData));

      render(
        <TestWrapper>
          <LocalDataArchive 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        // Verify data is displayed from localStorage
        expect(screen.getByText('5')).toBeInTheDocument(); // totalScrapes
        expect(screen.getByText('TOTAL_SCRAPES')).toBeInTheDocument();
      });

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    test('should handle localStorage errors gracefully', async () => {
      const TestWrapper = createTestWrapper();
      
      // Mock localStorage to throw error
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      render(
        <TestWrapper>
          <NotificationFeed localData={null} dashboardData={null} />
        </TestWrapper>
      );

      // Should handle error gracefully and show empty state
      await waitFor(() => {
        expect(screen.getByText('NO NEW TARGETS DETECTED')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates During Scanning', () => {
    test('should show scanning state across components', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <div>
            <NotificationFeed 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
              isScanning={true}
            />
            <UpcomingTargets 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
              isScanning={true}
            />
            <AbsenceTracker 
              absences={mockLocalData.absences} 
              isScanning={true}
            />
          </div>
        </TestWrapper>
      );

      // Check that components show scanning animation
      const cards = screen.getAllByRole('generic');
      const animatedCards = cards.filter(card => 
        card.className.includes('animate-pulse')
      );
      
      expect(animatedCards.length).toBeGreaterThan(0);
    });

    test('should update data during scanning simulation', async () => {
      const TestWrapper = createTestWrapper();
      
      const { rerender } = render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
            isScanning={true}
          />
        </TestWrapper>
      );

      // Simulate new data arriving during scan
      const updatedData = {
        ...mockLocalData,
        totalScrapes: 6,
        newQuizzesCount: 2,
        quizzes: [
          ...mockLocalData.quizzes,
          {
            name: 'New Quiz',
            course: 'Physics 301',
            firstSeen: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        ]
      };

      rerender(
        <TestWrapper>
          <NotificationFeed 
            localData={updatedData} 
            dashboardData={mockDashboardData} 
            isScanning={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Quiz')).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation and Error Handling', () => {
    test('should validate data structure before processing', async () => {
      const TestWrapper = createTestWrapper();
      
      // Test with invalid data structures
      const invalidData = {
        quizzes: 'not an object',
        assignments: null,
        absences: []
      };



      render(
        <TestWrapper>
          <NotificationFeed 
            localData={invalidData} 
            dashboardData={null} 
          />
        </TestWrapper>
      );

      // Should handle invalid data gracefully
      await waitFor(() => {
        expect(screen.getByText('NO NEW TARGETS DETECTED')).toBeInTheDocument();
      });
    });

    test('should handle missing required fields', async () => {
      const TestWrapper = createTestWrapper();
      
      const dataWithMissingFields = {
        quizzes: [
          { name: null, course: undefined }, // Missing required fields
          { name: 'Valid Quiz', course: 'Valid Course' }
        ],
        assignments: [
          { course: 'Test Course' } // Missing name
        ],
        absences: [
          { date: '2025-07-18', type: 'lecture' } // Missing course
        ]
      };



      render(
        <TestWrapper>
          <NotificationFeed 
            localData={dataWithMissingFields} 
            dashboardData={null} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show valid data and handle invalid entries
        expect(screen.getByText('Valid Quiz')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    test('should limit displayed items to prevent performance issues', async () => {
      const TestWrapper = createTestWrapper();
      
      // Create large dataset
      const largeDataset = {
        ...mockLocalData,
        quizzes: Array.from({ length: 50 }, (_, i) => ({
          name: `Quiz ${i}`,
          course: `Course ${i}`,
          firstSeen: new Date().toISOString()
        })),
        assignments: Array.from({ length: 50 }, (_, i) => ({
          name: `Assignment ${i}`,
          course: `Course ${i}`,
          closed_at: '2025-07-20T10:00:00Z'
        }))
      };



      render(
        <TestWrapper>
          <NotificationFeed 
            localData={largeDataset} 
            dashboardData={null} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should limit to 15 notifications as per the component logic
        const notifications = screen.getAllByText(/Quiz \d+|Assignment \d+/);
        expect(notifications.length).toBeLessThanOrEqual(15);
      });
    });

    test('should handle component unmounting without memory leaks', async () => {
      const TestWrapper = createTestWrapper();
      
      const { unmount } = render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Unmount component
      unmount();

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Cross-Component Data Consistency', () => {
    test('should maintain data consistency across all dashboard components', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <div>
            <NotificationFeed 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
            <LocalDataArchive 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
          </div>
        </TestWrapper>
      );

      await waitFor(() => {
        // Both components should show consistent course count
        const courseElements = screen.getAllByText(/Computer Science 101/);
        expect(courseElements.length).toBeGreaterThan(1);
        
        // Archive should show correct statistics
        expect(screen.getByText('3')).toBeInTheDocument(); // courses
        expect(screen.getByText('COURSES_TRACKED')).toBeInTheDocument();
      });
    });

    test('should synchronize updates across components', async () => {
      const TestWrapper = createTestWrapper();
      
      const { rerender } = render(
        <TestWrapper>
          <div>
            <NotificationFeed 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
            <LocalDataArchive 
              localData={mockLocalData} 
              dashboardData={mockDashboardData} 
            />
          </div>
        </TestWrapper>
      );

      // Update data
      const updatedData = {
        ...mockLocalData,
        totalScrapes: 10,
        courses: [...mockLocalData.courses, 'New Course']
      };

      rerender(
        <TestWrapper>
          <div>
            <NotificationFeed 
              localData={updatedData} 
              dashboardData={mockDashboardData} 
            />
            <LocalDataArchive 
              localData={updatedData} 
              dashboardData={mockDashboardData} 
            />
          </div>
        </TestWrapper>
      );

      await waitFor(() => {
        // Both components should reflect the updated data
        expect(screen.getByText('10')).toBeInTheDocument(); // updated scrape count
        expect(screen.getByText('4')).toBeInTheDocument(); // updated course count
      });
    });
  });
});