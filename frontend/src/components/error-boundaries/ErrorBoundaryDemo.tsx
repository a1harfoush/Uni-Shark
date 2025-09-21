"use client";

import React, { useState } from 'react';
import { DashboardErrorBoundary, SectionErrorBoundary } from './index';

// Component that can throw errors on demand for testing
const ErrorTrigger: React.FC<{ shouldThrow: boolean; errorType: string }> = ({ 
  shouldThrow, 
  errorType 
}) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Network request failed - unable to fetch data');
      case 'storage':
        throw new Error('Storage quota exceeded - cannot save data');
      case 'data':
        throw new Error('Data parsing failed - invalid JSON format');
      case 'render':
        throw new Error('Component render failed - missing required props');
      default:
        throw new Error('Unknown error occurred in component');
    }
  }
  
  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <h3 className="text-green-800 font-semibold">Component Working Normally</h3>
      <p className="text-green-700">No errors detected. All systems operational.</p>
    </div>
  );
};

// Demo component to test error boundaries
export const ErrorBoundaryDemo: React.FC = () => {
  const [triggerError, setTriggerError] = useState(false);
  const [errorType, setErrorType] = useState('network');
  const [boundaryType, setBoundaryType] = useState<'dashboard' | 'section'>('section');

  const handleTriggerError = () => {
    setTriggerError(true);
    // Reset after a short delay to allow testing recovery
    setTimeout(() => setTriggerError(false), 100);
  };

  const ErrorBoundaryWrapper = boundaryType === 'dashboard' ? DashboardErrorBoundary : SectionErrorBoundary;
  const wrapperProps = boundaryType === 'dashboard' 
    ? { section: 'Demo', enableRecovery: true }
    : { section: 'Demo Section' };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Error Boundary Demo</h2>
        
        {/* Controls */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Error Type:</label>
            <select 
              value={errorType} 
              onChange={(e) => setErrorType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="network">Network Error</option>
              <option value="storage">Storage Error</option>
              <option value="data">Data Error</option>
              <option value="render">Render Error</option>
              <option value="generic">Generic Error</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Boundary Type:</label>
            <select 
              value={boundaryType} 
              onChange={(e) => setBoundaryType(e.target.value as 'dashboard' | 'section')}
              className="w-full p-2 border rounded"
            >
              <option value="section">Section Error Boundary</option>
              <option value="dashboard">Dashboard Error Boundary</option>
            </select>
          </div>
          
          <button
            onClick={handleTriggerError}
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
          >
            Trigger {errorType.charAt(0).toUpperCase() + errorType.slice(1)} Error
          </button>
        </div>
      </div>

      {/* Error Boundary Test Area */}
      <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Error Boundary Test Area</h3>
        
        <ErrorBoundaryWrapper {...wrapperProps}>
          <ErrorTrigger shouldThrow={triggerError} errorType={errorType} />
        </ErrorBoundaryWrapper>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-blue-800 font-semibold mb-2">Instructions:</h3>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>1. Select an error type to test different error scenarios</li>
          <li>2. Choose between Dashboard or Section error boundary</li>
          <li>3. Click "Trigger Error" to see the error boundary in action</li>
          <li>4. Use the "Retry" button to recover from the error</li>
          <li>5. Use the "Restore Backup" button to test data recovery</li>
        </ul>
      </div>
    </div>
  );
};