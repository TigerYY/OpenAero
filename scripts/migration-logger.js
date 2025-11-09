#!/usr/bin/env node

/**
 * Migration Logging System
 * 
 * This script provides comprehensive logging for the user data migration process,
 * including detailed tracking, audit trails, and reporting capabilities.
 * 
 * Features:
 * - Structured logging with different levels
 * - Audit trail for all migration activities
 * - Performance monitoring and metrics
 * - Error tracking and analysis
 * - Progress reporting
 * - Log aggregation and analysis
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  logDir: './logs/migration',
  logLevels: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
  defaultLevel: 'INFO',
  enableConsole: true,
  enableFile: true,
  enableAudit: true,
  enableMetrics: true,
  logRetention: 30, // days
  maxLogSize: 100 * 1024 * 1024, // 100MB
  enableCompression: true
};

// Log levels with numeric values for filtering
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

class MigrationLogger {
  constructor(migrationId = null, config = CONFIG) {
    this.config = config;
    this.migrationId = migrationId || this.generateMigrationId();
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    this.logs = [];
    this.auditTrail = [];
    this.metrics = {
      startTime: this.startTime.toISOString(),
      endTime: null,
      duration: null,
      totalLogs: 0,
      logsByLevel: {},
      errors: [],
      warnings: [],
      performanceMetrics: {}
    };
    this.currentPhase = 'initialization';
  }

  generateMigrationId() {
    return `migration_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async initialize() {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
      await this.createLogFiles();
      
      this.info('Migration logger initialized', {
        migrationId: this.migrationId,
        sessionId: this.sessionId,
        startTime: this.startTime.toISOString()
      });
      
      return this.migrationId;
      
    } catch (error) {
      console.error('Failed to initialize migration logger:', error);
      throw error;
    }
  }

  async createLogFiles() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    this.logFiles = {
      main: path.join(this.config.logDir, `${this.migrationId}_${timestamp}.log`),
      audit: path.join(this.config.logDir, `${this.migrationId}_${timestamp}_audit.log`),
      metrics: path.join(this.config.logDir, `${this.migrationId}_${timestamp}_metrics.log`),
      errors: path.join(this.config.logDir, `${this.migrationId}_${timestamp}_errors.log`)
    };
    
    // Initialize log files with headers
    const header = `# Migration Log - ${this.migrationId}
# Started: ${this.startTime.toISOString()}
# Session: ${this.sessionId}
# Phase: ${this.currentPhase}

`;
    
    for (const [type, filePath] of Object.entries(this.logFiles)) {
      try {
        await fs.writeFile(filePath, header);
      } catch (error) {
        console.error(`Failed to create log file ${filePath}:`, error);
      }
    }
  }

  log(level, message, data = null, context = {}) {
    const logEntry = this.createLogEntry(level, message, data, context);
    
    // Add to in-memory logs
    this.logs.push(logEntry);
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;
    
    // Special handling for errors and warnings
    if (level === 'ERROR' || level === 'FATAL') {
      this.metrics.errors.push(logEntry);
    } else if (level === 'WARN') {
      this.metrics.warnings.push(logEntry);
    }
    
    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }
    
    // File output
    if (this.config.enableFile) {
      this.logToFile(logEntry);
    }
    
    // Audit trail
    if (this.config.enableAudit && this.shouldAudit(level, message)) {
      this.addToAuditTrail(logEntry);
    }
    
    return logEntry;
  }

  createLogEntry(level, message, data, context) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: {
        ...context,
        migrationId: this.migrationId,
        sessionId: this.sessionId,
        phase: this.currentPhase,
        thread: 'main'
      },
      id: crypto.randomUUID()
    };
  }

  logToConsole(logEntry) {
    const levelColor = this.getLevelColor(logEntry.level);
    const timestamp = logEntry.timestamp.substring(11, 23); // HH:mm:ss.sss
    const phase = `[${logEntry.context.phase}]`;
    
    console.log(
      `${levelColor}[${timestamp}]${phase} ${logEntry.level}: ${logEntry.message}`,
      logEntry.data || ''
    );
  }

  getLevelColor(level) {
    const colors = {
      DEBUG: '\x1b[36m', // cyan
      INFO: '\x1b[32m',  // green
      WARN: '\x1b[33m',  // yellow
      ERROR: '\x1b[31m', // red
      FATAL: '\x1b[35m'  // magenta
    };
    
    return colors[level] || '';
  }

  async logToFile(logEntry) {
    const logLine = this.formatLogEntry(logEntry) + '\n';
    
    try {
      // Main log file
      await fs.appendFile(this.logFiles.main, logLine);
      
      // Error-specific log file
      if (logEntry.level === 'ERROR' || logEntry.level === 'FATAL') {
        await fs.appendFile(this.logFiles.errors, logLine);
      }
      
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  formatLogEntry(logEntry) {
    const { timestamp, level, message, data, context } = logEntry;
    let logLine = `${timestamp} [${context.phase}] ${level}: ${message}`;
    
    if (data) {
      logLine += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    return logLine;
  }

  shouldAudit(level, message) {
    // Audit significant events
    const auditPatterns = [
      'migration',
      'backup',
      'restore',
      'error',
      'conflict',
      'validation',
      'completion',
      'rollback'
    ];
    
    const messageLower = message.toLowerCase();
    return auditPatterns.some(pattern => messageLower.includes(pattern)) ||
           level === 'ERROR' || level === 'FATAL';
  }

  addToAuditTrail(logEntry) {
    const auditEntry = {
      ...logEntry,
      auditTimestamp: new Date().toISOString(),
      action: this.extractAction(logEntry.message),
      severity: this.determineSeverity(logEntry.level)
    };
    
    this.auditTrail.push(auditEntry);
    
    // Write to audit file
    const auditLine = JSON.stringify(auditEntry) + '\n';
    fs.appendFile(this.logFiles.audit, auditLine).catch(err => {
      console.error('Failed to write to audit log:', err);
    });
  }

  extractAction(message) {
    const actions = [
      'START', 'COMPLETE', 'FAIL', 'SKIP', 'VALIDATE', 
      'MIGRATE', 'BACKUP', 'RESTORE', 'CONFLICT', 'ERROR'
    ];
    
    const messageUpper = message.toUpperCase();
    for (const action of actions) {
      if (messageUpper.includes(action)) {
        return action;
      }
    }
    
    return 'UNKNOWN';
  }

  determineSeverity(level) {
    const severityMap = {
      DEBUG: 'LOW',
      INFO: 'MEDIUM',
      WARN: 'HIGH',
      ERROR: 'CRITICAL',
      FATAL: 'CRITICAL'
    };
    
    return severityMap[level] || 'MEDIUM';
  }

  // Convenience methods
  debug(message, data, context) { 
    return this.log('DEBUG', message, data, context); 
  }
  
  info(message, data, context) { 
    return this.log('INFO', message, data, context); 
  }
  
  warn(message, data, context) { 
    return this.log('WARN', message, data, context); 
  }
  
  error(message, data, context) { 
    return this.log('ERROR', message, data, context); 
  }
  
  fatal(message, data, context) { 
    return this.log('FATAL', message, data, context); 
  }

  // Phase management
  setPhase(phase) {
    const oldPhase = this.currentPhase;
    this.currentPhase = phase;
    
    this.info(`Migration phase changed`, {
      from: oldPhase,
      to: phase
    });
  }

  // Performance monitoring
  startTimer(operation) {
    const startTime = process.hrtime.bigint();
    
    return {
      operation,
      startTime,
      end: () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        this.recordMetric(operation, duration);
        
        return duration;
      }
    };
  }

  recordMetric(operation, duration) {
    if (!this.metrics.performanceMetrics[operation]) {
      this.metrics.performanceMetrics[operation] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
    }
    
    const metric = this.metrics.performanceMetrics[operation];
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    
    this.debug(`Performance metric recorded`, {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      average: `${metric.averageDuration.toFixed(2)}ms`,
      count: metric.count
    });
  }

  // Progress tracking
  logProgress(current, total, operation = 'processing') {
    const percentage = total > 0 ? ((current / total) * 100).toFixed(1) : '0.0';
    
    this.info(`Progress: ${percentage}%`, {
      current,
      total,
      operation,
      percentage: parseFloat(percentage)
    });
  }

  // Migration lifecycle events
  logMigrationStart(metadata = {}) {
    this.setPhase('start');
    this.info('Migration started', {
      migrationId: this.migrationId,
      startTime: this.startTime.toISOString(),
      ...metadata
    });
  }

  logMigrationComplete(results = {}) {
    this.setPhase('complete');
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    this.metrics.endTime = endTime.toISOString();
    this.metrics.duration = duration;
    
    this.info('Migration completed', {
      migrationId: this.migrationId,
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      results
    });
  }

  logMigrationFailure(error, context = {}) {
    this.setPhase('failed');
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    this.metrics.endTime = endTime.toISOString();
    this.metrics.duration = duration;
    
    this.fatal('Migration failed', {
      migrationId: this.migrationId,
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      context
    });
  }

  // Data migration events
  logUserMigration(userId, action, details = {}) {
    this.info(`User migration: ${action}`, {
      userId,
      action,
      details,
      phase: this.currentPhase
    });
  }

  logConflictDetection(conflicts) {
    this.warn(`Conflicts detected`, {
      count: conflicts.length,
      conflicts: conflicts.map(c => ({
        type: c.type,
        severity: c.severity,
        description: c.description
      })),
      phase: this.currentPhase
    });
  }

  logValidation(validationResults) {
    const { passed, failed, errors } = validationResults;
    
    if (failed === 0) {
      this.info('Validation passed', {
        total: passed,
        phase: this.currentPhase
      });
    } else {
      this.warn('Validation failed', {
        passed,
        failed,
        errors,
        phase: this.currentPhase
      });
    }
  }

  // Report generation
  async generateReport() {
    const report = {
      migrationId: this.migrationId,
      sessionId: this.sessionId,
      summary: this.metrics,
      auditTrail: this.auditTrail,
      performanceAnalysis: this.analyzePerformance(),
      errorAnalysis: this.analyzeErrors(),
      recommendations: this.generateRecommendations()
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(this.config.logDir, `${this.migrationId}_report_${timestamp}.json`);
    
    try {
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      this.info('Migration report generated', { reportFile });
      return reportFile;
    } catch (error) {
      this.error('Failed to generate report', error);
      throw error;
    }
  }

  analyzePerformance() {
    const analysis = {
      totalOperations: 0,
      totalDuration: 0,
      slowestOperation: null,
      fastestOperation: null,
      bottlenecks: []
    };
    
    for (const [operation, metrics] of Object.entries(this.metrics.performanceMetrics)) {
      analysis.totalOperations += metrics.count;
      analysis.totalDuration += metrics.totalDuration;
      
      if (!analysis.slowestOperation || metrics.maxDuration > analysis.slowestOperation.maxDuration) {
        analysis.slowestOperation = { operation, ...metrics };
      }
      
      if (!analysis.fastestOperation || metrics.minDuration < analysis.fastestOperation.minDuration) {
        analysis.fastestOperation = { operation, ...metrics };
      }
      
      // Identify bottlenecks (operations with average duration > 1000ms)
      if (metrics.averageDuration > 1000) {
        analysis.bottlenecks.push({ operation, ...metrics });
      }
    }
    
    return analysis;
  }

  analyzeErrors() {
    const analysis = {
      totalErrors: this.metrics.errors.length,
      totalWarnings: this.metrics.warnings.length,
      errorPatterns: {},
      criticalErrors: [],
      errorFrequency: {}
    };
    
    this.metrics.errors.forEach(error => {
      // Extract error patterns
      const pattern = this.extractErrorPattern(error.message);
      analysis.errorPatterns[pattern] = (analysis.errorPatterns[pattern] || 0) + 1;
      
      // Identify critical errors
      if (error.level === 'FATAL') {
        analysis.criticalErrors.push(error);
      }
    });
    
    return analysis;
  }

  extractErrorPattern(message) {
    // Simple pattern extraction - could be enhanced with regex
    const patterns = ['connection', 'timeout', 'permission', 'validation', 'duplicate'];
    const messageLower = message.toLowerCase();
    
    for (const pattern of patterns) {
      if (messageLower.includes(pattern)) {
        return pattern;
      }
    }
    
    return 'other';
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    const bottlenecks = this.analyzePerformance().bottlenecks;
    if (bottlenecks.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `${bottlenecks.length} operations identified as performance bottlenecks`,
        actions: bottlenecks.map(b => `Optimize ${b.operation} operation`)
      });
    }
    
    // Error recommendations
    if (this.metrics.errors.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        message: `${this.metrics.errors.length} errors occurred during migration`,
        actions: ['Review error patterns', 'Implement better error handling', 'Add retry logic']
      });
    }
    
    // Success recommendations
    if (this.metrics.errors.length === 0 && this.metrics.totalLogs > 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        message: 'Migration completed without errors',
        actions: ['Proceed to next phase', 'Archive migration logs']
      });
    }
    
    return recommendations;
  }

  // Cleanup
  async cleanup() {
    this.info('Migration logger cleanup', {
      migrationId: this.migrationId,
      totalLogs: this.metrics.totalLogs
    });
    
    // Generate final report
    await this.generateReport();
    
    // Compress old logs if enabled
    if (this.config.enableCompression) {
      await this.compressOldLogs();
    }
  }

  async compressOldLogs() {
    // Implementation for log compression
    // This would compress logs older than retention period
    this.debug('Log compression not implemented yet');
  }
}

// Singleton instance for global access
let globalLogger = null;

function getGlobalLogger() {
  if (!globalLogger) {
    globalLogger = new MigrationLogger();
  }
  return globalLogger;
}

// Export for use in other scripts
module.exports = { 
  MigrationLogger, 
  getGlobalLogger,
  LOG_LEVELS,
  CONFIG
};