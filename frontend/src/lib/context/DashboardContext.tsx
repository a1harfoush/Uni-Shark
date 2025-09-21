// /frontend/src/lib/context/DashboardContext.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ScanProgressState {
  message: string;
  percentage: number;
}

interface DashboardContextType {
  isScanning: boolean;
  setIsScanning: (isScanning: boolean) => void;
  scanProgress: ScanProgressState;
  setScanProgress: (progress: ScanProgressState) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgressState>({ message: "Scanning for targets...", percentage: 0 });

  return (
    <DashboardContext.Provider value={{ isScanning, setIsScanning, scanProgress, setScanProgress }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};