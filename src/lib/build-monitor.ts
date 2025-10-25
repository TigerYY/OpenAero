/**
 * Build monitoring utility for deployment optimization
 * Tracks build performance and provides debugging information
 */

export interface BuildMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  errors: string[];
  warnings: string[];
  success: boolean;
}

export class BuildMonitor {
  private metrics: BuildMetrics;
  private static instance: BuildMonitor;

  constructor() {
    this.metrics = {
      startTime: Date.now(),
      errors: [],
      warnings: [],
      success: false,
    };
  }

  static getInstance(): BuildMonitor {
    if (!BuildMonitor.instance) {
      BuildMonitor.instance = new BuildMonitor();
    }
    return BuildMonitor.instance;
  }

  start(): void {
    this.metrics.startTime = Date.now();
    this.metrics.errors = [];
    this.metrics.warnings = [];
    this.metrics.success = false;
  }

  addError(error: string): void {
    this.metrics.errors.push(error);
  }

  addWarning(warning: string): void {
    this.metrics.warnings.push(warning);
  }

  finish(success: boolean): void {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    this.metrics.success = success;
  }

  getMetrics(): BuildMetrics {
    return { ...this.metrics };
  }

  logMetrics(): void {
    console.log('Build Metrics:', {
      duration: this.metrics.duration,
      success: this.metrics.success,
      errorCount: this.metrics.errors.length,
      warningCount: this.metrics.warnings.length,
    });

    if (this.metrics.errors.length > 0) {
      console.error('Build Errors:', this.metrics.errors);
    }

    if (this.metrics.warnings.length > 0) {
      console.warn('Build Warnings:', this.metrics.warnings);
    }
  }
}

export const buildMonitor = BuildMonitor.getInstance();
