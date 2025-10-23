#!/usr/bin/env node

/**
 * Status Reporter Script
 * Generates comprehensive status reports for PRD document enhancement
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const moment = require('moment');

class StatusReporter {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      features: [],
      summary: {},
      metrics: {},
      trends: {}
    };
  }

  async generateReport() {
    console.log(chalk.blue('📊 Generating Status Report...'));
    
    // Load feature data
    await this.loadFeatureData();
    
    // Calculate summary statistics
    this.calculateSummary();
    
    // Calculate metrics
    this.calculateMetrics();
    
    // Generate trends
    this.calculateTrends();
    
    // Generate reports
    await this.generateMarkdownReport();
    await this.generateJsonReport();
    await this.generateHtmlReport();
    
    console.log(chalk.green('✅ Status report generated successfully!'));
  }

  async loadFeatureData() {
    const featureFiles = glob.sync('DOCS/prd/status-tracking/*.md', { cwd: process.cwd() });
    
    for (const file of featureFiles) {
      const content = await fs.readFile(file, 'utf8');
      const featureData = this.parseFeatureData(content, path.basename(file, '.md'));
      this.reportData.features.push(featureData);
    }
  }

  parseFeatureData(content, fileName) {
    const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*\[([^\]]+)\]/);
    const progressMatch = content.match(/\*\*Progress\*\*:\s*(\d+)%/);
    const lastUpdatedMatch = content.match(/\*\*Last Updated\*\*:\s*\[([^\]]+)\]/);
    const versionMatch = content.match(/\*\*Version\*\*:\s*([^\s]+)/);
    const categoryMatch = content.match(/\*\*Category\*\*:\s*([^\n]+)/);
    
    return {
      id: fileName,
      status: statusMatch ? statusMatch[1] : 'Unknown',
      priority: priorityMatch ? priorityMatch[1] : 'Unknown',
      progress: progressMatch ? parseInt(progressMatch[1]) : 0,
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : 'Unknown',
      version: versionMatch ? versionMatch[1] : 'Unknown',
      category: categoryMatch ? categoryMatch[1].trim() : 'Unknown'
    };
  }

  calculateSummary() {
    const features = this.reportData.features;
    const totalFeatures = features.length;
    
    const statusCounts = {};
    const priorityCounts = {};
    const categoryCounts = {};
    
    let totalProgress = 0;
    let completedFeatures = 0;
    
    features.forEach(feature => {
      // Status counts
      statusCounts[feature.status] = (statusCounts[feature.status] || 0) + 1;
      
      // Priority counts
      priorityCounts[feature.priority] = (priorityCounts[feature.priority] || 0) + 1;
      
      // Category counts
      categoryCounts[feature.category] = (categoryCounts[feature.category] || 0) + 1;
      
      // Progress calculations
      totalProgress += feature.progress;
      if (feature.status === '✅ Completed') {
        completedFeatures++;
      }
    });
    
    this.reportData.summary = {
      totalFeatures,
      completedFeatures,
      inProgressFeatures: statusCounts['🔄 In Progress'] || 0,
      plannedFeatures: statusCounts['📋 Planned'] || 0,
      blockedFeatures: statusCounts['⚠️ Blocked'] || 0,
      deprecatedFeatures: statusCounts['❌ Deprecated'] || 0,
      averageProgress: totalFeatures > 0 ? Math.round(totalProgress / totalFeatures) : 0,
      completionRate: totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0,
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      categoryDistribution: categoryCounts
    };
  }

  calculateMetrics() {
    const features = this.reportData.features;
    
    // Calculate velocity (features completed per week)
    const completedFeatures = features.filter(f => f.status === '✅ Completed');
    const velocity = completedFeatures.length; // Simplified - would need historical data
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(features);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(features);
    
    this.reportData.metrics = {
      velocity,
      qualityScore,
      riskScore,
      onTimeDelivery: this.calculateOnTimeDelivery(features),
      technicalDebt: this.calculateTechnicalDebt(features)
    };
  }

  calculateQualityScore(features) {
    // Simplified quality score calculation
    const completedFeatures = features.filter(f => f.status === '✅ Completed');
    const totalFeatures = features.length;
    
    if (totalFeatures === 0) return 0;
    
    // Base score from completion rate
    let score = (completedFeatures.length / totalFeatures) * 100;
    
    // Bonus for high priority completion
    const highPriorityCompleted = completedFeatures.filter(f => f.priority === 'P0' || f.priority === 'P1').length;
    const highPriorityTotal = features.filter(f => f.priority === 'P0' || f.priority === 'P1').length;
    
    if (highPriorityTotal > 0) {
      score += (highPriorityCompleted / highPriorityTotal) * 20;
    }
    
    return Math.min(Math.round(score), 100);
  }

  calculateRiskScore(features) {
    let riskScore = 0;
    
    // High priority features that are not completed
    const highPriorityIncomplete = features.filter(f => 
      (f.priority === 'P0' || f.priority === 'P1') && f.status !== '✅ Completed'
    );
    riskScore += highPriorityIncomplete.length * 10;
    
    // Blocked features
    const blockedFeatures = features.filter(f => f.status === '⚠️ Blocked');
    riskScore += blockedFeatures.length * 15;
    
    // Features with low progress but high priority
    const lowProgressHighPriority = features.filter(f => 
      f.priority === 'P0' && f.progress < 50
    );
    riskScore += lowProgressHighPriority.length * 5;
    
    return Math.min(riskScore, 100);
  }

  calculateOnTimeDelivery(features) {
    // Simplified calculation - would need historical data
    const completedFeatures = features.filter(f => f.status === '✅ Completed');
    const totalFeatures = features.length;
    
    if (totalFeatures === 0) return 0;
    
    // Assume 80% on-time delivery for now
    return 80;
  }

  calculateTechnicalDebt(features) {
    // Simplified technical debt calculation
    const deprecatedFeatures = features.filter(f => f.status === '❌ Deprecated');
    const totalFeatures = features.length;
    
    if (totalFeatures === 0) return 0;
    
    return Math.round((deprecatedFeatures.length / totalFeatures) * 100);
  }

  calculateTrends() {
    // Simplified trends - would need historical data
    this.reportData.trends = {
      completionTrend: 'increasing',
      velocityTrend: 'stable',
      qualityTrend: 'improving',
      riskTrend: 'decreasing'
    };
  }

  async generateMarkdownReport() {
    const reportPath = 'DOCS/reports/status-report.md';
    await fs.ensureDir(path.dirname(reportPath));
    
    const report = this.generateMarkdownContent();
    await fs.writeFile(reportPath, report);
    
    console.log(chalk.green(`📄 Markdown report saved to: ${reportPath}`));
  }

  generateMarkdownContent() {
    const { summary, metrics, trends } = this.reportData;
    
    return `# Status Report - PRD Document Enhancement

**Generated**: ${moment().format('YYYY-MM-DD HH:mm:ss')}  
**Period**: ${moment().subtract(1, 'month').format('YYYY-MM-DD')} to ${moment().format('YYYY-MM-DD')}

## Executive Summary

- **Total Features**: ${summary.totalFeatures}
- **Completed Features**: ${summary.completedFeatures} (${summary.completionRate}%)
- **In Progress**: ${summary.inProgressFeatures}
- **Planned**: ${summary.plannedFeatures}
- **Average Progress**: ${summary.averageProgress}%

## Status Distribution

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Completed | ${summary.completedFeatures} | ${Math.round((summary.completedFeatures / summary.totalFeatures) * 100)}% |
| 🔄 In Progress | ${summary.inProgressFeatures} | ${Math.round((summary.inProgressFeatures / summary.totalFeatures) * 100)}% |
| 📋 Planned | ${summary.plannedFeatures} | ${Math.round((summary.plannedFeatures / summary.totalFeatures) * 100)}% |
| ⚠️ Blocked | ${summary.blockedFeatures} | ${Math.round((summary.blockedFeatures / summary.totalFeatures) * 100)}% |
| ❌ Deprecated | ${summary.deprecatedFeatures} | ${Math.round((summary.deprecatedFeatures / summary.totalFeatures) * 100)}% |

## Priority Distribution

| Priority | Count | Percentage |
|----------|-------|------------|
| P0 | ${summary.priorityDistribution.P0 || 0} | ${Math.round(((summary.priorityDistribution.P0 || 0) / summary.totalFeatures) * 100)}% |
| P1 | ${summary.priorityDistribution.P1 || 0} | ${Math.round(((summary.priorityDistribution.P1 || 0) / summary.totalFeatures) * 100)}% |
| P2 | ${summary.priorityDistribution.P2 || 0} | ${Math.round(((summary.priorityDistribution.P2 || 0) / summary.totalFeatures) * 100)}% |
| P3 | ${summary.priorityDistribution.P3 || 0} | ${Math.round(((summary.priorityDistribution.P3 || 0) / summary.totalFeatures) * 100)}% |

## Key Metrics

- **Quality Score**: ${metrics.qualityScore}/100
- **Risk Score**: ${metrics.riskScore}/100
- **On-Time Delivery**: ${metrics.onTimeDelivery}%
- **Technical Debt**: ${metrics.technicalDebt}%

## Trends

- **Completion Trend**: ${trends.completionTrend}
- **Velocity Trend**: ${trends.velocityTrend}
- **Quality Trend**: ${trends.qualityTrend}
- **Risk Trend**: ${trends.riskTrend}

## Feature Details

| Feature | Status | Priority | Progress | Category | Last Updated |
|---------|--------|----------|----------|----------|--------------|
${this.reportData.features.map(f => 
  `| ${f.id} | ${f.status} | ${f.priority} | ${f.progress}% | ${f.category} | ${f.lastUpdated} |`
).join('\n')}

## Recommendations

${this.generateRecommendations()}

---

*Report generated by Status Reporter v1.0.0*
`;
  }

  generateRecommendations() {
    const { summary, metrics } = this.reportData;
    const recommendations = [];
    
    if (summary.completionRate < 50) {
      recommendations.push('- Focus on completing high-priority features to improve overall completion rate');
    }
    
    if (metrics.riskScore > 50) {
      recommendations.push('- Address blocked features and high-priority incomplete items to reduce risk');
    }
    
    if (summary.blockedFeatures > 0) {
      recommendations.push('- Investigate and resolve blocked features to maintain momentum');
    }
    
    if (metrics.qualityScore < 80) {
      recommendations.push('- Implement quality gates and review processes to improve quality score');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Continue current development pace and maintain quality standards');
    }
    
    return recommendations.join('\n');
  }

  async generateJsonReport() {
    const reportPath = 'DOCS/reports/status-report.json';
    await fs.writeJson(reportPath, this.reportData, { spaces: 2 });
    console.log(chalk.green(`📄 JSON report saved to: ${reportPath}`));
  }

  async generateHtmlReport() {
    const reportPath = 'DOCS/reports/status-report.html';
    const htmlContent = this.generateHtmlContent();
    await fs.writeFile(reportPath, htmlContent);
    console.log(chalk.green(`📄 HTML report saved to: ${reportPath}`));
  }

  generateHtmlContent() {
    const { summary, metrics } = this.reportData;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Status Report - PRD Document Enhancement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #e8f4fd; border-radius: 5px; }
        .status-completed { color: #28a745; }
        .status-in-progress { color: #ffc107; }
        .status-planned { color: #17a2b8; }
        .status-blocked { color: #dc3545; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Status Report - PRD Document Enhancement</h1>
        <p>Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <h3>Total Features</h3>
            <p>${summary.totalFeatures}</p>
        </div>
        <div class="metric">
            <h3>Completed</h3>
            <p class="status-completed">${summary.completedFeatures} (${summary.completionRate}%)</p>
        </div>
        <div class="metric">
            <h3>In Progress</h3>
            <p class="status-in-progress">${summary.inProgressFeatures}</p>
        </div>
        <div class="metric">
            <h3>Planned</h3>
            <p class="status-planned">${summary.plannedFeatures}</p>
        </div>
        <div class="metric">
            <h3>Quality Score</h3>
            <p>${metrics.qualityScore}/100</p>
        </div>
        <div class="metric">
            <h3>Risk Score</h3>
            <p>${metrics.riskScore}/100</p>
        </div>
    </div>
    
    <h2>Feature Details</h2>
    <table>
        <tr>
            <th>Feature</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Progress</th>
            <th>Category</th>
            <th>Last Updated</th>
        </tr>
        ${this.reportData.features.map(f => `
        <tr>
            <td>${f.id}</td>
            <td class="status-${f.status.includes('Completed') ? 'completed' : f.status.includes('Progress') ? 'in-progress' : f.status.includes('Planned') ? 'planned' : 'blocked'}">${f.status}</td>
            <td>${f.priority}</td>
            <td>${f.progress}%</td>
            <td>${f.category}</td>
            <td>${f.lastUpdated}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }
}

// CLI interface
async function main() {
  const reporter = new StatusReporter();
  await reporter.generateReport();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StatusReporter;
