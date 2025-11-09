#!/usr/bin/env node

/**
 * Migration Report Generator
 * Generates comprehensive reports for user migration to Supabase Auth
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

class MigrationReportGenerator {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.prisma = new PrismaClient();
    this.reportData = {
      migration: {},
      validation: {},
      conflicts: {},
      performance: {},
      security: {},
      recommendations: []
    };
  }

  async generateComprehensiveReport() {
    console.log('📊 Generating comprehensive migration report...');
    
    try {
      await this.gatherMigrationData();
      await this.gatherValidationData();
      await this.gatherConflictData();
      await this.gatherPerformanceData();
      await this.gatherSecurityData();
      await this.generateRecommendations();
      
      const report = await this.createFinalReport();
      await this.saveReport(report);
      
      console.log('✅ Migration report generated successfully!');
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate migration report:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async gatherMigrationData() {
    console.log('📥 Gathering migration data...');
    
    try {
      // Get migration statistics
      const migrationStats = await this.prisma.users.groupBy({
        by: ['migration_status'],
        _count: {
          id: true
        }
      });
      
      this.reportData.migration = {
        totalUsers: await this.prisma.users.count(),
        migrationStatus: migrationStats.reduce((acc, stat) => {
          acc[stat.migration_status || 'unknown'] = stat._count.id;
          return acc;
        }, {}),
        migratedUsers: await this.prisma.users.count({
          where: {
            migration_status: 'completed',
            supabase_id: { not: null }
          }
        }),
        failedMigrations: await this.prisma.users.count({
          where: {
            migration_status: 'failed'
          }
        }),
        migrationDate: await this.getMigrationDate()
      };
      
      // Get Supabase user count
      const { data: supabaseUsers, error } = await this.supabase.auth.admin.listUsers();
      
      if (!error) {
        this.reportData.migration.supabaseUsers = supabaseUsers.users.length;
        this.reportData.migration.supabaseUsersByDate = this.groupUsersByDate(supabaseUsers.users);
      }
      
    } catch (error) {
      console.warn('Warning: Could not gather some migration data:', error.message);
    }
  }

  async gatherValidationData() {
    console.log('✅ Gathering validation data...');
    
    try {
      // Look for validation reports
      const reportsDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(reportsDir);
      
      const validationReports = files.filter(file => 
        file.includes('validation-report') && file.endsWith('.json')
      );
      
      if (validationReports.length > 0) {
        const latestReport = validationReports.sort().pop();
        const reportPath = path.join(reportsDir, latestReport);
        const reportData = JSON.parse(await fs.readFile(reportPath, 'utf8'));
        
        this.reportData.validation = {
          reportFile: latestReport,
          userCounts: reportData.userCount || {},
          dataIntegrity: reportData.dataIntegrity || {},
          functionality: reportData.functionality || {},
          performance: reportData.performance || {},
          issues: reportData.issues || [],
          warnings: reportData.warnings || []
        };
      }
      
    } catch (error) {
      console.warn('Warning: Could not load validation data:', error.message);
    }
  }

  async gatherConflictData() {
    console.log('⚔️ Gathering conflict data...');
    
    try {
      // Look for conflict resolution reports
      const conflictsDir = path.join(process.cwd(), 'migrations');
      const files = await fs.readdir(conflictsDir);
      
      const conflictReports = files.filter(file => 
        file.includes('conflict-resolution-report') && file.endsWith('.json')
      );
      
      if (conflictReports.length > 0) {
        const latestReport = conflictReports.sort().pop();
        const reportPath = path.join(conflictsDir, latestReport);
        const reportData = JSON.parse(await fs.readFile(reportPath, 'utf8'));
        
        this.reportData.conflicts = {
          reportFile: latestReport,
          summary: reportData.summary || {},
          conflictBreakdown: reportData.conflictBreakdown || {},
          recommendations: reportData.recommendations || []
        };
      }
      
    } catch (error) {
      console.warn('Warning: Could not load conflict data:', error.message);
    }
  }

  async gatherPerformanceData() {
    console.log('⚡ Gathering performance data...');
    
    try {
      // Get database performance metrics
      const dbStats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN migration_status = 'completed' THEN 1 END) as migrated_users,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
        FROM users
        WHERE migration_status IS NOT NULL
      `;
      
      this.reportData.performance = {
        database: dbStats[0] || {},
        migrationDuration: await this.calculateMigrationDuration(),
        throughput: await this.calculateMigrationThroughput()
      };
      
    } catch (error) {
      console.warn('Warning: Could not gather performance data:', error.message);
    }
  }

  async gatherSecurityData() {
    console.log('🔒 Gathering security data...');
    
    try {
      // Check for security-related issues
      const usersWithPasswords = await this.prisma.users.count({
        where: {
          password: { not: null }
        }
      });
      
      const usersWithTempEmails = await this.prisma.users.count({
        where: {
          email: { contains: 'temp_' }
        }
      });
      
      const usersWithModifiedEmails = await this.prisma.users.count({
        where: {
          user_metadata: {
            path: ['email_modified_for_migration'],
            equals: true
          }
        }
      });
      
      this.reportData.security = {
        usersWithPasswords,
        usersWithTempEmails,
        usersWithModifiedEmails,
        securityScore: this.calculateSecurityScore({
          usersWithPasswords,
          usersWithTempEmails,
          usersWithModifiedEmails
        })
      };
      
    } catch (error) {
      console.warn('Warning: Could not gather security data:', error.message);
    }
  }

  async generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Migration completion recommendations
    if (this.reportData.migration.failedMigrations > 0) {
      recommendations.push({
        priority: 'high',
        category: 'migration',
        title: 'Address Failed Migrations',
        description: `${this.reportData.migration.failedMigrations} users failed to migrate`,
        action: 'Review migration logs and resolve failed migrations'
      });
    }
    
    // Security recommendations
    if (this.reportData.security.usersWithPasswords > 0) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Remove Local Passwords',
        description: `${this.reportData.security.usersWithPasswords} users still have passwords in local database`,
        action: 'Remove password fields from local database after verification'
      });
    }
    
    if (this.reportData.security.usersWithTempEmails > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'user_experience',
        title: 'Update Temporary Emails',
        description: `${this.reportData.security.usersWithTempEmails} users have temporary email addresses`,
        action: 'Contact users to update their email addresses'
      });
    }
    
    // Data integrity recommendations
    if (this.reportData.validation.issues && this.reportData.validation.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'data_integrity',
        title: 'Resolve Data Issues',
        description: `${this.reportData.validation.issues.length} data integrity issues found`,
        action: 'Review and resolve data integrity issues'
      });
    }
    
    // Performance recommendations
    if (this.reportData.performance.migrationDuration > 3600000) { // More than 1 hour
      recommendations.push({
        priority: 'low',
        category: 'performance',
        title: 'Optimize Migration Performance',
        description: 'Migration took longer than expected',
        action: 'Consider optimizing batch sizes and processing logic'
      });
    }
    
    this.reportData.recommendations = recommendations;
  }

  async createFinalReport() {
    const report = {
      metadata: {
        title: 'Supabase Auth Migration Report',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      summary: this.createExecutiveSummary(),
      sections: {
        migration: this.reportData.migration,
        validation: this.reportData.validation,
        conflicts: this.reportData.conflicts,
        performance: this.reportData.performance,
        security: this.reportData.security
      },
      recommendations: this.reportData.recommendations,
      nextSteps: this.generateNextSteps()
    };
    
    return report;
  }

  createExecutiveSummary() {
    const { migration, validation, conflicts, security } = this.reportData;
    
    return {
      migrationStatus: {
        total: migration.totalUsers || 0,
        migrated: migration.migratedUsers || 0,
        failed: migration.failedMigrations || 0,
        successRate: migration.totalUsers > 0 
          ? Math.round((migration.migratedUsers / migration.totalUsers) * 100) 
          : 0
      },
      validationStatus: {
        issues: validation.issues?.length || 0,
        warnings: validation.warnings?.length || 0,
        passed: (validation.issues?.length || 0) === 0
      },
      conflictStatus: {
        total: conflicts.summary?.totalConflicts || 0,
        resolved: conflicts.summary?.resolvedConflicts || 0,
        autoResolved: conflicts.summary?.autoResolvedConflicts || 0
      },
      securityStatus: {
        score: security.securityScore || 'unknown',
        risks: [
          security.usersWithPasswords > 0 ? 'passwords_in_db' : null,
          security.usersWithTempEmails > 0 ? 'temp_emails' : null
        ].filter(Boolean)
      },
      overallStatus: this.calculateOverallStatus()
    };
  }

  calculateOverallStatus() {
    const { migration, validation, security } = this.reportData;
    
    const hasFailedMigrations = migration.failedMigrations > 0;
    const hasValidationIssues = validation.issues && validation.issues.length > 0;
    const hasSecurityRisks = security.usersWithPasswords > 0;
    
    if (hasFailedMigrations || hasValidationIssues) {
      return 'needs_attention';
    } else if (hasSecurityRisks) {
      return 'requires_followup';
    } else {
      return 'successful';
    }
  }

  generateNextSteps() {
    const steps = [];
    
    if (this.reportData.migration.failedMigrations > 0) {
      steps.push({
        title: 'Resolve Failed Migrations',
        priority: 1,
        description: 'Review and retry failed user migrations',
        estimatedTime: '1-2 hours'
      });
    }
    
    if (this.reportData.security.usersWithPasswords > 0) {
      steps.push({
        title: 'Clean Up Local Passwords',
        priority: 2,
        description: 'Remove password fields from local database',
        estimatedTime: '30 minutes'
      });
    }
    
    if (this.reportData.security.usersWithTempEmails > 0) {
      steps.push({
        title: 'Contact Users with Temporary Emails',
        priority: 3,
        description: 'Notify users to update their email addresses',
        estimatedTime: '2-4 hours'
      });
    }
    
    steps.push({
      title: 'Monitor Authentication Metrics',
      priority: 4,
      description: 'Set up monitoring for Supabase Auth performance',
      estimatedTime: '1 hour'
    });
    
    steps.push({
      title: 'Update Documentation',
      priority: 5,
      description: 'Update technical documentation with new auth system',
      estimatedTime: '2-3 hours'
    });
    
    return steps;
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = path.join(process.cwd(), 'reports');
    
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportFile = path.join(reportsDir, `migration-report-${timestamp}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    // Also save a human-readable version
    const markdownFile = path.join(reportsDir, `migration-report-${timestamp}.md`);
    const markdown = this.convertToMarkdown(report);
    await fs.writeFile(markdownFile, markdown);
    
    console.log(`📄 Reports saved:`);
    console.log(`   JSON: ${reportFile}`);
    console.log(`   Markdown: ${markdownFile}`);
    
    return { reportFile, markdownFile };
  }

  convertToMarkdown(report) {
    const { metadata, summary, sections, recommendations, nextSteps } = report;
    
    let markdown = `# ${metadata.title}\n\n`;
    markdown += `**Generated:** ${new Date(metadata.generatedAt).toLocaleString()}\n`;
    markdown += `**Environment:** ${metadata.environment}\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `**Migration Status:** ${summary.migrationStatus.successRate}% success rate\n`;
    markdown += `- Total Users: ${summary.migrationStatus.total}\n`;
    markdown += `- Migrated: ${summary.migrationStatus.migrated}\n`;
    markdown += `- Failed: ${summary.migrationStatus.failed}\n\n`;
    
    markdown += `**Validation Status:** ${summary.validationStatus.passed ? '✅ Passed' : '❌ Issues Found'}\n`;
    markdown += `- Issues: ${summary.validationStatus.issues}\n`;
    markdown += `- Warnings: ${summary.validationStatus.warnings}\n\n`;
    
    markdown += `**Overall Status:** ${summary.overallStatus.replace('_', ' ').toUpperCase()}\n\n`;
    
    // Detailed Sections
    markdown += `## Migration Details\n\n`;
    markdown += `- Total Users: ${sections.migration.totalUsers || 'N/A'}\n`;
    markdown += `- Migrated Users: ${sections.migration.migratedUsers || 'N/A'}\n`;
    markdown += `- Failed Migrations: ${sections.migration.failedMigrations || 'N/A'}\n`;
    markdown += `- Supabase Users: ${sections.migration.supabaseUsers || 'N/A'}\n\n`;
    
    // Security
    if (sections.security.usersWithPasswords > 0) {
      markdown += `## Security Concerns\n\n`;
      markdown += `⚠️ **Security Issues Found:**\n`;
      markdown += `- Users with passwords in local DB: ${sections.security.usersWithPasswords}\n`;
      markdown += `- Users with temporary emails: ${sections.security.usersWithTempEmails}\n`;
      markdown += `- Users with modified emails: ${sections.security.usersWithModifiedEmails}\n\n`;
    }
    
    // Recommendations
    if (recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      recommendations.forEach(rec => {
        markdown += `### ${rec.title} (${rec.priority})\n`;
        markdown += `**Description:** ${rec.description}\n`;
        markdown += `**Action:** ${rec.action}\n\n`;
      });
    }
    
    // Next Steps
    markdown += `## Next Steps\n\n`;
    nextSteps.forEach((step, index) => {
      markdown += `${index + 1}. **${step.title}** (Priority: ${step.priority})\n`;
      markdown += `   - ${step.description}\n`;
      markdown += `   - Estimated time: ${step.estimatedTime}\n\n`;
    });
    
    return markdown;
  }

  // Helper methods
  async getMigrationDate() {
    try {
      const result = await this.prisma.users.aggregate({
        _max: {
          migrated_at: true
        },
        where: {
          migrated_at: { not: null }
        }
      });
      
      return result._max.migrated_at;
    } catch (error) {
      return null;
    }
  }

  groupUsersByDate(users) {
    return users.reduce((acc, user) => {
      const date = user.created_at?.split('T')[0];
      if (date) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {});
  }

  async calculateMigrationDuration() {
    try {
      const result = await this.prisma.users.aggregate({
        _min: {
          migrated_at: true
        },
        _max: {
          migrated_at: true
        },
        where: {
          migrated_at: { not: null }
        }
      });
      
      if (result._min.migrated_at && result._max.migrated_at) {
        return new Date(result._max.migrated_at) - new Date(result._min.migrated_at);
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async calculateMigrationThroughput() {
    try {
      const duration = await this.calculateMigrationDuration();
      const migratedCount = await this.prisma.users.count({
        where: {
          migration_status: 'completed'
        }
      });
      
      if (duration > 0) {
        return {
          usersPerMinute: (migratedCount / (duration / 60000)).toFixed(2),
          usersPerHour: (migratedCount / (duration / 3600000)).toFixed(2)
        };
      }
      
      return { usersPerMinute: 0, usersPerHour: 0 };
    } catch (error) {
      return { usersPerMinute: 0, usersPerHour: 0 };
    }
  }

  calculateSecurityScore(securityData) {
    let score = 100;
    
    if (securityData.usersWithPasswords > 0) {
      score -= 30;
    }
    
    if (securityData.usersWithTempEmails > 0) {
      score -= 20;
    }
    
    if (securityData.usersWithModifiedEmails > 0) {
      score -= 10;
    }
    
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
}

// CLI interface
if (require.main === module) {
  const generator = new MigrationReportGenerator();
  generator.generateComprehensiveReport()
    .then((report) => {
      console.log('\n✅ Migration report generated successfully!');
      console.log('📊 Executive Summary:');
      console.log(`   Migration Success Rate: ${report.summary.migrationStatus.successRate}%`);
      console.log(`   Overall Status: ${report.summary.overallStatus.toUpperCase()}`);
      console.log(`   Recommendations: ${report.recommendations.length}`);
    })
    .catch((error) => {
      console.error('\n❌ Failed to generate migration report:', error);
      process.exit(1);
    });
}

module.exports = MigrationReportGenerator;