/**
 * Network Connectivity Monitor
 * 
 * Detects network connectivity changes and triggers automatic retry
 * mechanisms when connectivity is restored.
 */

// import { retryService } from './retry-service'; // Commented out - service doesn't exist

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
}

export interface NetworkMonitorEvents {
  onOnline: (status: NetworkStatus) => void;
  onOffline: (status: NetworkStatus) => void;
  onConnectionChange: (status: NetworkStatus) => void;
  onSlowConnection: (status: NetworkStatus) => void;
}

export class NetworkMonitor {
  private currentStatus: NetworkStatus;
  private events: Partial<NetworkMonitorEvents>;
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private connectionHistory: Array<{ timestamp: string; isOnline: boolean }> = [];
  private readonly maxHistorySize = 100;

  constructor(events: Partial<NetworkMonitorEvents> = {}) {
    this.events = events;
    this.currentStatus = this.getInitialNetworkStatus();
    this.setupEventListeners();
  }

  /**
   * Start monitoring network connectivity
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.updateNetworkStatus();
    
    // Check network status every 30 seconds
    this.checkInterval = setInterval(() => {
      this.updateNetworkStatus();
    }, 30000);

    console.log('Network monitoring started');
  }

  /**
   * Stop monitoring network connectivity
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('Network monitoring stopped');
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get connection history
   */
  getConnectionHistory(): Array<{ timestamp: string; isOnline: boolean }> {
    return [...this.connectionHistory];
  }

  /**
   * Check if connection is considered slow
   */
  isSlowConnection(): boolean {
    return (
      this.currentStatus.effectiveType === 'slow-2g' ||
      this.currentStatus.effectiveType === '2g' ||
      this.currentStatus.downlink < 1 ||
      this.currentStatus.rtt > 2000
    );
  }

  /**
   * Get connection quality score (0-100)
   */
  getConnectionQuality(): number {
    if (!this.currentStatus.isOnline) return 0;

    let score = 100;

    // Penalize based on effective type
    switch (this.currentStatus.effectiveType) {
      case 'slow-2g':
        score -= 70;
        break;
      case '2g':
        score -= 50;
        break;
      case '3g':
        score -= 30;
        break;
      case '4g':
        score -= 10;
        break;
    }

    // Penalize based on RTT
    if (this.currentStatus.rtt > 1000) score -= 30;
    else if (this.currentStatus.rtt > 500) score -= 20;
    else if (this.currentStatus.rtt > 200) score -= 10;

    // Penalize based on downlink
    if (this.currentStatus.downlink < 0.5) score -= 40;
    else if (this.currentStatus.downlink < 1) score -= 25;
    else if (this.currentStatus.downlink < 2) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Test actual connectivity by making a request
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Setup browser event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', this.handleConnectionChange.bind(this));
    }
  }

  /**
   * Handle online event
   */
  private async handleOnline(): Promise<void> {
    const wasOffline = !this.currentStatus.isOnline;
    
    this.updateNetworkStatus();
    
    if (wasOffline) {
      this.currentStatus.lastConnectedAt = new Date().toISOString();
      this.addToHistory(true);
      
      console.log('Network connection restored');
      
      if (this.events.onOnline) {
        this.events.onOnline(this.currentStatus);
      }

      // Trigger retry of failed operations
      await this.triggerRetryOnReconnection();
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    const wasOnline = this.currentStatus.isOnline;
    
    this.currentStatus.isOnline = false;
    this.currentStatus.lastDisconnectedAt = new Date().toISOString();
    
    if (wasOnline) {
      this.addToHistory(false);
      
      console.log('Network connection lost');
      
      if (this.events.onOffline) {
        this.events.onOffline(this.currentStatus);
      }
    }
  }

  /**
   * Handle connection property changes
   */
  private handleConnectionChange(): void {
    const previousStatus = { ...this.currentStatus };
    this.updateNetworkStatus();
    
    // Check if connection became slow
    if (this.isSlowConnection() && !this.wasSlowConnection(previousStatus)) {
      if (this.events.onSlowConnection) {
        this.events.onSlowConnection(this.currentStatus);
      }
    }
    
    if (this.events.onConnectionChange) {
      this.events.onConnectionChange(this.currentStatus);
    }
  }

  /**
   * Update current network status
   */
  private updateNetworkStatus(): void {
    this.currentStatus = {
      ...this.currentStatus,
      isOnline: navigator.onLine,
      ...this.getConnectionInfo()
    };
  }

  /**
   * Get initial network status
   */
  private getInitialNetworkStatus(): NetworkStatus {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      ...this.getConnectionInfo()
    };
  }

  /**
   * Get connection information from Navigator API
   */
  private getConnectionInfo(): Partial<NetworkStatus> {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return {};
    }

    const connection = (navigator as any).connection;
    
    return {
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    };
  }

  /**
   * Check if previous status had slow connection
   */
  private wasSlowConnection(previousStatus: NetworkStatus): boolean {
    return (
      previousStatus.effectiveType === 'slow-2g' ||
      previousStatus.effectiveType === '2g' ||
      previousStatus.downlink < 1 ||
      previousStatus.rtt > 2000
    );
  }

  /**
   * Add connection status to history
   */
  private addToHistory(isOnline: boolean): void {
    this.connectionHistory.push({
      timestamp: new Date().toISOString(),
      isOnline
    });

    // Keep history size manageable
    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory = this.connectionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Trigger retry of failed operations when connection is restored
   */
  private async triggerRetryOnReconnection(): Promise<void> {
    try {
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test actual connectivity
      const hasConnectivity = await this.testConnectivity();
      
      if (hasConnectivity) {
        console.log('Triggering retry of failed operations after reconnection');
        // await retryService.processImmediately(); // Commented out - service doesn't exist
      } else {
        console.warn('Browser reports online but connectivity test failed');
      }
    } catch (error) {
      console.error('Error triggering retry on reconnection:', error);
    }
  }

  /**
   * Get network stability metrics
   */
  getStabilityMetrics(): {
    disconnectionCount: number;
    averageUptime: number;
    averageDowntime: number;
    stabilityScore: number;
  } {
    if (this.connectionHistory.length < 2) {
      return {
        disconnectionCount: 0,
        averageUptime: 0,
        averageDowntime: 0,
        stabilityScore: 100
      };
    }

    let disconnectionCount = 0;
    let totalUptime = 0;
    let totalDowntime = 0;
    let uptimeSegments = 0;
    let downtimeSegments = 0;

    for (let i = 1; i < this.connectionHistory.length; i++) {
      const current = this.connectionHistory[i];
      const previous = this.connectionHistory[i - 1];
      
      if (!current.isOnline && previous.isOnline) {
        disconnectionCount++;
      }

      const duration = new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime();
      
      if (previous.isOnline) {
        totalUptime += duration;
        uptimeSegments++;
      } else {
        totalDowntime += duration;
        downtimeSegments++;
      }
    }

    const averageUptime = uptimeSegments > 0 ? totalUptime / uptimeSegments : 0;
    const averageDowntime = downtimeSegments > 0 ? totalDowntime / downtimeSegments : 0;
    
    // Calculate stability score (0-100)
    const totalTime = totalUptime + totalDowntime;
    const uptimeRatio = totalTime > 0 ? totalUptime / totalTime : 1;
    const stabilityScore = Math.round(uptimeRatio * 100);

    return {
      disconnectionCount,
      averageUptime: Math.round(averageUptime / 1000), // Convert to seconds
      averageDowntime: Math.round(averageDowntime / 1000), // Convert to seconds
      stabilityScore
    };
  }
}

// Singleton instance for global use
export const networkMonitor = new NetworkMonitor({
  onOnline: (status) => {
    console.log('Network back online:', status);
  },
  onOffline: (status) => {
    console.log('Network went offline:', status);
  },
  onSlowConnection: (status) => {
    console.warn('Slow connection detected:', status);
  }
});