// Tests for useLocalScrapeData hook
import { renderHook, act } from '@testing-library/react';
import { useLocalScrapeData, mergeScrapeData } from '../useLocalScrapeData';

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('useLocalScrapeData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('mergeScrapeData function', () => {
    it('should merge new data with empty old data', () => {
      const oldData = {};
      const newData = {
        quizzes: {
          quizzes_with_results: [
            { name: 'Quiz 1', course: 'Math 101', grade: '85%' }
          ],
          quizzes_without_results: [
            { name: 'Quiz 2', course: 'Physics 201' }
          ]
        },
        assignments: {
          assignments: [
            { name: 'Assignment 1', course: 'Math 101' }
          ]
        },
        absences: {
          absences: [
            { date: 'Fri, 18/07/2025', type: 'lecture', course: 'Math 101' }
          ]
        }
      };

      const result = mergeScrapeData(oldData, newData);

      expect(result.totalScrapes).toBe(1);
      expect(result.quizzes).toHaveLength(2);
      expect(result.assignments).toHaveLength(1);
      expect(result.absences).toHaveLength(1);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should merge new data with existing old data without duplicates', () => {
      const oldData = {
        totalScrapes: 1,
        quizzes: [
          { 
            name: 'Quiz 1', 
            course: 'Math 101', 
            grade: '85%',
            firstSeen: '2025-07-17T10:00:00.000Z'
          }
        ],
        assignments: [
          { 
            name: 'Assignment 1', 
            course: 'Math 101',
            firstSeen: '2025-07-17T10:00:00.000Z'
          }
        ],
        absences: [],
        courses: ['Math 101']
      };

      const newData = {
        quizzes: {
          quizzes_with_results: [
            { name: 'Quiz 1', course: 'Math 101', grade: '90%' }, // Updated grade
            { name: 'Quiz 2', course: 'Physics 201', grade: '78%' } // New quiz
          ],
          quizzes_without_results: []
        },
        assignments: {
          assignments: [
            { name: 'Assignment 1', course: 'Math 101', status: 'Submitted' }, // Updated status
            { name: 'Assignment 2', course: 'Physics 201' } // New assignment
          ]
        },
        absences: {
          absences: [
            { date: 'Fri, 18/07/2025', type: 'lecture', course: 'Math 101' }
          ]
        }
      };

      const result = mergeScrapeData(oldData, newData);

      expect(result.totalScrapes).toBe(2);
      expect(result.quizzes).toHaveLength(2);
      expect(result.assignments).toHaveLength(2);
      expect(result.absences).toHaveLength(1);
      
      // Should update existing Quiz 1 with new grade
      const updatedQuiz = result.quizzes.find((q: any) => q.name === 'Quiz 1');
      expect(updatedQuiz.grade).toBe('90%');
      expect(updatedQuiz.firstSeen).toBe('2025-07-17T10:00:00.000Z'); // Should preserve firstSeen
      expect(updatedQuiz.lastUpdated).toBeDefined(); // Should have new lastUpdated
      
      // Should add new Quiz 2
      const newQuiz = result.quizzes.find((q: any) => q.name === 'Quiz 2');
      expect(newQuiz).toBeDefined();
      expect(newQuiz.grade).toBe('78%');
    });

    it('should handle course extraction correctly', () => {
      const oldData = { courses: ['Math 101'] };
      const newData = {
        quizzes: {
          courses_found_on_page: ['Physics 201', 'Chemistry 301'],
          quizzes_with_results: [
            { name: 'Quiz 1', course: 'Biology 101' }
          ]
        },
        assignments: {
          courses_found_on_page: ['History 201'],
          assignments: [
            { name: 'Assignment 1', course: 'English 101' }
          ]
        },
        absences: {
          absences: [
            { course: 'Art 101', date: 'Fri, 18/07/2025', type: 'lecture' }
          ]
        }
      };

      const result = mergeScrapeData(oldData, newData);

      expect(result.courses).toContain('Math 101'); // Existing course
      expect(result.courses).toContain('Physics 201'); // From quizzes page
      expect(result.courses).toContain('Chemistry 301'); // From quizzes page
      expect(result.courses).toContain('Biology 101'); // From quiz item
      expect(result.courses).toContain('History 201'); // From assignments page
      expect(result.courses).toContain('English 101'); // From assignment item
      expect(result.courses).toContain('Art 101'); // From absence item
      expect(result.courses.length).toBe(7);
    });

    it('should maintain raw data history with limit', () => {
      const oldData = {
        rawData: Array.from({ length: 5 }, (_, i) => ({
          timestamp: `2025-07-${String(i + 10).padStart(2, '0')}T10:00:00.000Z`,
          data: { test: `data${i}` }
        }))
      };

      const newData = {
        quizzes: { quizzes_with_results: [], quizzes_without_results: [] },
        assignments: { assignments: [] },
        absences: { absences: [] }
      };

      const result = mergeScrapeData(oldData, newData);

      expect(result.rawData).toHaveLength(5); // Should maintain limit of 5
      expect(result.rawData[4].data).toEqual(newData); // New data should be at the end
      expect(result.rawData[0].data).toEqual({ test: 'data1' }); // Oldest should be removed
    });

    it('should handle malformed or missing data gracefully', () => {
      const oldData = {};
      const newData = {
        quizzes: null, // Malformed
        assignments: undefined, // Missing
        absences: { absences: null }, // Malformed nested
        course_registration: { available_courses: [] } // Valid
      };

      expect(() => {
        const result = mergeScrapeData(oldData, newData);
        expect(result.totalScrapes).toBe(1);
        expect(result.course_registration).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('useLocalScrapeData hook behavior', () => {
    it('should initialize with null when no stored data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalScrapeData(null));

      expect(result.current).toBeNull();
    });

    it('should initialize with stored data when it exists', () => {
      const storedData = {
        totalScrapes: 2,
        quizzes: [{ name: 'Quiz 1', course: 'Math 101' }],
        lastUpdated: '2025-07-18T10:00:00.000Z'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(() => useLocalScrapeData(null));

      expect(result.current).toEqual(storedData);
    });

    it('should merge new remote data with existing local data', () => {
      const existingData = {
        totalScrapes: 1,
        quizzes: [{ name: 'Quiz 1', course: 'Math 101', firstSeen: '2025-07-17T10:00:00.000Z' }],
        assignments: [],
        absences: []
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData));

      const newRemoteData = {
        scraped_data: {
          quizzes: {
            quizzes_with_results: [
              { name: 'Quiz 1', course: 'Math 101', grade: '90%' }, // Update existing
              { name: 'Quiz 2', course: 'Physics 201', grade: '85%' } // Add new
            ],
            quizzes_without_results: []
          },
          assignments: { assignments: [] },
          absences: { absences: [] }
        }
      };

      const { result, rerender } = renderHook(
        ({ remoteData }) => useLocalScrapeData(remoteData),
        { initialProps: { remoteData: null } }
      );

      // Initially should have existing data
      expect(result.current).toEqual(existingData);

      // Update with new remote data
      act(() => {
        rerender({ remoteData: newRemoteData });
      });

      // Should have merged data
      expect(result.current.totalScrapes).toBe(2);
      expect(result.current.quizzes).toHaveLength(2);
      
      // Should preserve firstSeen for existing quiz
      const existingQuiz = result.current.quizzes.find((q: any) => q.name === 'Quiz 1');
      expect(existingQuiz.firstSeen).toBe('2025-07-17T10:00:00.000Z');
      expect(existingQuiz.grade).toBe('90%'); // Should have updated grade
    });

    it('should not process duplicate scrape data', () => {
      localStorageMock.getItem.mockReturnValue('{}');

      const remoteData = {
        scraped_data: {
          quizzes: { quizzes_with_results: [{ name: 'Quiz 1' }] },
          assignments: { assignments: [] },
          absences: { absences: [] }
        }
      };

      const { result, rerender } = renderHook(
        ({ remoteData }) => useLocalScrapeData(remoteData),
        { initialProps: { remoteData: null } }
      );

      // First update
      act(() => {
        rerender({ remoteData });
      });

      const firstResult = result.current;
      expect(firstResult.totalScrapes).toBe(1);

      // Same data again - should not process
      act(() => {
        rerender({ remoteData });
      });

      expect(result.current.totalScrapes).toBe(1); // Should not increment
    });

    it('should save merged data to localStorage', () => {
      localStorageMock.getItem.mockReturnValue('{}');

      const remoteData = {
        scraped_data: {
          quizzes: { quizzes_with_results: [{ name: 'Quiz 1', course: 'Math 101' }] },
          assignments: { assignments: [] },
          absences: { absences: [] }
        }
      };

      const { rerender } = renderHook(
        ({ remoteData }) => useLocalScrapeData(remoteData),
        { initialProps: { remoteData: null } }
      );

      act(() => {
        rerender({ remoteData });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userScrapeData_test-user-id',
        expect.stringContaining('"totalScrapes":1')
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => {
        renderHook(() => useLocalScrapeData(null));
      }).not.toThrow();
    });

    it('should clear data when userId changes', () => {
      const storedData = { totalScrapes: 1, quizzes: [] };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      // Mock changing userId
      const mockUseAuth = require('@clerk/nextjs').useAuth as jest.Mock;
      
      const { result, rerender } = renderHook(() => useLocalScrapeData(null));
      
      expect(result.current).toEqual(storedData);

      // Change userId
      mockUseAuth.mockReturnValue({ userId: 'different-user-id' });
      
      act(() => {
        rerender();
      });

      // Should load data for new user (which would be null if no data exists)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('userScrapeData_different-user-id');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json{');

      expect(() => {
        renderHook(() => useLocalScrapeData(null));
      }).not.toThrow();
    });

    it('should handle null userId gracefully', () => {
      // Mock changing userId to null
      jest.doMock('@clerk/nextjs', () => ({
        useAuth: () => ({ userId: null }),
        useUser: () => ({ user: null, isLoaded: true }),
        ClerkProvider: ({ children }: any) => children,
      }));

      const { result } = renderHook(() => useLocalScrapeData(null));

      expect(result.current).toBeNull();
    });

    it('should handle server-side rendering (no window)', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const { result } = renderHook(() => useLocalScrapeData(null));

      expect(result.current).toBeNull();

      global.window = originalWindow;
    });
  });
});