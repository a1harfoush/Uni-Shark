"use client";

import React, { Component, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { DataRecoveryEngine } from '@/lib/data-recovery-engine';
import { logger, LogLevel, OperationType } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableRecovery?: boolean;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  recoveryAttempts: number;
  isRecovering: boolean;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onRestore: () => void;
  isRecovering: boolean;
  recoveryAttempts: number;
  section?: string;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  private dataRecoveryEngine: DataRecoveryEngine;
  private maxRecoveryAttempts = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
      isRecovering: false
    };

    this.dataRecoveryEngine = new DataRecoveryEngine();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error with context
    logger.log(LogLevel.ERROR, OperationType.ERROR_RECOVERY, 'Component error caught by boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      section: this.props.section,
      recoveryAttempts: this.state.recoveryAttempts
    }, error);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery if enabled and within limits
    if (this.props.enableRecovery && this.state.recoveryAttempts < this.maxRecoveryAttempts) {
      this.attemptAutomaticRecovery();
    }
  }

  private attemptAutomaticRecovery = async () => {
    if (this.state.isRecovering) return;

    this.setState({ isRecovering: true });

    try {
      logger.log(LogLevel.INFO, OperationType.ERROR_RECOVERY, 'Attempting automatic recovery', {
        section: this.props.section,
        attempt: this.state.recoveryAttempts + 1
      });

      // Try to recover data from backup
      const recovered = await this.dataRecoveryEngine.recoverFromBackup();
      
      if (recovered) {
        logger.log(LogLevel.INFO, OperationType.ERROR_RECOVERY, 'Automatic recovery successful');
        this.handleRetry();
        return;
      }

      // If backup recovery fails, try alternative recovery strategies
      await this.tryAlternativeRecovery();

    } catch (recoveryError) {
      logger.log(LogLevel.ERROR, OperationType.ERROR_RECOVERY, 'Automatic recovery failed', {
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
        section: this.props.section
      }, recoveryError instanceof Error ? recoveryError : undefined);
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  private tryAlternativeRecovery = async () => {
    const strategies = [
      'clearCorruptedData',
      'resetToDefaults',
      'refreshFromServer'
    ];

    for (const strategy of strategies) {
      try {
        logger.log(LogLevel.INFO, OperationType.ERROR_RECOVERY, `Trying recovery strategy: ${strategy}`);
        
        switch (strategy) {
          case 'clearCorruptedData':
            await this.dataRecoveryEngine.clearCorruptedLocalData();
            break;
          case 'resetToDefaults':
            await this.dataRecoveryEngine.resetToDefaults();
            break;
          case 'refreshFromServer':
            await this.dataRecoveryEngine.refreshFromServer();
            break;
        }

        logger.log(LogLevel.INFO, OperationType.ERROR_RECOVERY, `Recovery strategy ${strategy} completed successfully`);
        return true;
      } catch (error) {
        logger.log(LogLevel.WARN, OperationType.ERROR_RECOVERY, `Recovery strategy ${strategy} failed`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return false;
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: prevState.recoveryAttempts + 1,
      isRecovering: false
    }));

    logger.log(LogLevel.INFO, OperationType.ERROR_RECOVERY, 'Error boundary reset after recovery attempt', {
      section: this.props.section,
      totalAttempts: this.state.recoveryAttempts + 1
    });
  };

  private handleRestore = async () => {
    this.setState({ isRecovering: true });

    try {
      logger.log(LogLevel.INFO, OperationType.ERROR_RECOVERY, 'Manual restore initiated', {
        section: this.props.section
      });

      // Attempt to restore from backup data
      const restored = await this.dataRecoveryEngine.restoreFromBackup();
      
      if (restored) {
        this.handleRetry();
      } else {
        throw new Error('Backup restoration failed');
      }
    } catch (error) {
      logger.log(LogLevel.ERROR, OperationType.ERROR_RECOVERY, 'Manual restore failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        section: this.props.section
      }, error instanceof Error ? error : undefined);
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onRestore={this.handleRestore}
          isRecovering={this.state.isRecovering}
          recoveryAttempts={this.state.recoveryAttempts}
          section={this.props.section}
        />
      );
    }

    return this.props.children;
  }
}