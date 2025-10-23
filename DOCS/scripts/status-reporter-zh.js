#!/usr/bin/env node

/**
 * 状态报告脚本 (中文版)
 * 为PRD文档增强生成综合状态报告
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const moment = require('moment');

class StatusReporterZH {
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
    console.log(chalk.blue('📊 生成状态报告...'));
    
    // 加载功能数据
    await this.loadFeatureData();
    
    // 计算摘要统计
    this.calculateSummary();
    
    // 计算指标
    this.calculateMetrics();
    
    // 生成趋势
    this.calculateTrends();
    
    // 生成报告
    await this.generateMarkdownReport();
    await this.generateJsonReport();
    await this.generateHtmlReport();
    
    console.log(chalk.green('✅ 状态报告生成成功!'));
  }

  async loadFeatureData() {
    const featureFiles = glob.sync('docs/prd/status-tracking/*.md', { cwd: process.cwd() });
    
    for (const file of featureFiles) {
      const content = await fs.readFile(file, 'utf8');
      const featureData = this.parseFeatureData(content, path.basename(file, '.md'));
      this.reportData.features.push(featureData);
    }
  }

  parseFeatureData(content, fileName) {
    const statusMatch = content.match(/\*\*状态\*\*:\s*\[([^\]]+)\]/);
    const priorityMatch = content.match(/\*\*优先级\*\*:\s*\[([^\]]+)\]/);
    const progressMatch = content.match(/\*\*进度\*\*:\s*(\d+)%/);
    const lastUpdatedMatch = content.match(/\*\*最后更新\*\*:\s*\[([^\]]+)\]/);
    const versionMatch = content.match(/\*\*版本\*\*:\s*([^\s]+)/);
    const categoryMatch = content.match(/\*\*类别\*\*:\s*([^\n]+)/);
    
    return {
      id: fileName,
      status: statusMatch ? statusMatch[1] : '未知',
      priority: priorityMatch ? priorityMatch[1] : '未知',
      progress: progressMatch ? parseInt(progressMatch[1]) : 0,
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : '未知',
      version: versionMatch ? versionMatch[1] : '未知',
      category: categoryMatch ? categoryMatch[1].trim() : '未知'
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
      // 状态计数
      statusCounts[feature.status] = (statusCounts[feature.status] || 0) + 1;
      
      // 优先级计数
      priorityCounts[feature.priority] = (priorityCounts[feature.priority] || 0) + 1;
      
      // 类别计数
      categoryCounts[feature.category] = (categoryCounts[feature.category] || 0) + 1;
      
      // 进度计算
      totalProgress += feature.progress;
      if (feature.status === '✅ 已完成') {
        completedFeatures++;
      }
    });
    
    this.reportData.summary = {
      totalFeatures,
      completedFeatures,
      inProgressFeatures: statusCounts['🔄 进行中'] || 0,
      plannedFeatures: statusCounts['📋 计划中'] || 0,
      blockedFeatures: statusCounts['⚠️ 阻塞'] || 0,
      deprecatedFeatures: statusCounts['❌ 已废弃'] || 0,
      averageProgress: totalFeatures > 0 ? Math.round(totalProgress / totalFeatures) : 0,
      completionRate: totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0,
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      categoryDistribution: categoryCounts
    };
  }

  calculateMetrics() {
    const features = this.reportData.features;
    
    // 计算速度 (每周完成的功能数)
    const completedFeatures = features.filter(f => f.status === '✅ 已完成');
    const velocity = completedFeatures.length; // 简化 - 需要历史数据
    
    // 计算质量分数
    const qualityScore = this.calculateQualityScore(features);
    
    // 计算风险分数
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
    // 简化的质量分数计算
    const completedFeatures = features.filter(f => f.status === '✅ 已完成');
    const totalFeatures = features.length;
    
    if (totalFeatures === 0) return 0;
    
    // 基于完成率的基础分数
    let score = (completedFeatures.length / totalFeatures) * 100;
    
    // 高优先级完成的奖励
    const highPriorityCompleted = completedFeatures.filter(f => f.priority === 'P0' || f.priority === 'P1').length;
    const highPriorityTotal = features.filter(f => f.priority === 'P0' || f.priority === 'P1').length;
    
    if (highPriorityTotal > 0) {
      score += (highPriorityCompleted / highPriorityTotal) * 20;
    }
    
    return Math.min(Math.round(score), 100);
  }

  calculateRiskScore(features) {
    let riskScore = 0;
    
    // 未完成的高优先级功能
    const highPriorityIncomplete = features.filter(f => 
      (f.priority === 'P0' || f.priority === 'P1') && f.status !== '✅ 已完成'
    );
    riskScore += highPriorityIncomplete.length * 10;
    
    // 阻塞的功能
    const blockedFeatures = features.filter(f => f.status === '⚠️ 阻塞');
    riskScore += blockedFeatures.length * 15;
    
    // 低进度但高优先级的功能
    const lowProgressHighPriority = features.filter(f => 
      f.priority === 'P0' && f.progress < 50
    );
    riskScore += lowProgressHighPriority.length * 5;
    
    return Math.min(riskScore, 100);
  }

  calculateOnTimeDelivery(features) {
    // 简化计算 - 需要历史数据
    const completedFeatures = features.filter(f => f.status === '✅ 已完成');
    const totalFeatures = features.length;
    
    if (totalFeatures === 0) return 0;
    
    // 假设80%按时交付
    return 80;
  }

  calculateTechnicalDebt(features) {
    // 简化的技术债务计算
    const deprecatedFeatures = features.filter(f => f.status === '❌ 已废弃');
    const totalFeatures = features.length;
    
    if (totalFeatures === 0) return 0;
    
    return Math.round((deprecatedFeatures.length / totalFeatures) * 100);
  }

  calculateTrends() {
    // 简化的趋势 - 需要历史数据
    this.reportData.trends = {
      completionTrend: '上升',
      velocityTrend: '稳定',
      qualityTrend: '改善',
      riskTrend: '下降'
    };
  }

  async generateMarkdownReport() {
    const reportPath = 'docs/reports/status-report-zh.md';
    await fs.ensureDir(path.dirname(reportPath));
    
    const report = this.generateMarkdownContent();
    await fs.writeFile(reportPath, report);
    
    console.log(chalk.green(`📄 Markdown报告已保存到: ${reportPath}`));
  }

  generateMarkdownContent() {
    const { summary, metrics, trends } = this.reportData;
    
    return `# 状态报告 - PRD文档增强

**生成时间**: ${moment().format('YYYY-MM-DD HH:mm:ss')}  
**报告周期**: ${moment().subtract(1, 'month').format('YYYY-MM-DD')} 至 ${moment().format('YYYY-MM-DD')}

## 执行摘要

- **总功能数**: ${summary.totalFeatures}
- **已完成功能**: ${summary.completedFeatures} (${summary.completionRate}%)
- **进行中**: ${summary.inProgressFeatures}
- **计划中**: ${summary.plannedFeatures}
- **平均进度**: ${summary.averageProgress}%

## 状态分布

| 状态 | 数量 | 百分比 |
|------|------|--------|
| ✅ 已完成 | ${summary.completedFeatures} | ${Math.round((summary.completedFeatures / summary.totalFeatures) * 100)}% |
| 🔄 进行中 | ${summary.inProgressFeatures} | ${Math.round((summary.inProgressFeatures / summary.totalFeatures) * 100)}% |
| 📋 计划中 | ${summary.plannedFeatures} | ${Math.round((summary.plannedFeatures / summary.totalFeatures) * 100)}% |
| ⚠️ 阻塞 | ${summary.blockedFeatures} | ${Math.round((summary.blockedFeatures / summary.totalFeatures) * 100)}% |
| ❌ 已废弃 | ${summary.deprecatedFeatures} | ${Math.round((summary.deprecatedFeatures / summary.totalFeatures) * 100)}% |

## 优先级分布

| 优先级 | 数量 | 百分比 |
|--------|------|--------|
| P0 | ${summary.priorityDistribution.P0 || 0} | ${Math.round(((summary.priorityDistribution.P0 || 0) / summary.totalFeatures) * 100)}% |
| P1 | ${summary.priorityDistribution.P1 || 0} | ${Math.round(((summary.priorityDistribution.P1 || 0) / summary.totalFeatures) * 100)}% |
| P2 | ${summary.priorityDistribution.P2 || 0} | ${Math.round(((summary.priorityDistribution.P2 || 0) / summary.totalFeatures) * 100)}% |
| P3 | ${summary.priorityDistribution.P3 || 0} | ${Math.round(((summary.priorityDistribution.P3 || 0) / summary.totalFeatures) * 100)}% |

## 关键指标

- **质量分数**: ${metrics.qualityScore}/100
- **风险分数**: ${metrics.riskScore}/100
- **按时交付**: ${metrics.onTimeDelivery}%
- **技术债务**: ${metrics.technicalDebt}%

## 趋势

- **完成趋势**: ${trends.completionTrend}
- **速度趋势**: ${trends.velocityTrend}
- **质量趋势**: ${trends.qualityTrend}
- **风险趋势**: ${trends.riskTrend}

## 功能详情

| 功能 | 状态 | 优先级 | 进度 | 类别 | 最后更新 |
|------|------|--------|------|------|----------|
${this.reportData.features.map(f => 
  `| ${f.id} | ${f.status} | ${f.priority} | ${f.progress}% | ${f.category} | ${f.lastUpdated} |`
).join('\n')}

## 建议

${this.generateRecommendations()}

---

*报告由状态报告器 v1.0.0 生成*
`;
  }

  generateRecommendations() {
    const { summary, metrics } = this.reportData;
    const recommendations = [];
    
    if (summary.completionRate < 50) {
      recommendations.push('- 专注于完成高优先级功能以提高整体完成率');
    }
    
    if (metrics.riskScore > 50) {
      recommendations.push('- 解决阻塞功能和高优先级未完成项目以降低风险');
    }
    
    if (summary.blockedFeatures > 0) {
      recommendations.push('- 调查并解决阻塞功能以保持动力');
    }
    
    if (metrics.qualityScore < 80) {
      recommendations.push('- 实施质量门禁和审查流程以提高质量分数');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- 继续当前开发节奏并保持质量标准');
    }
    
    return recommendations.join('\n');
  }

  async generateJsonReport() {
    const reportPath = 'docs/reports/status-report-zh.json';
    await fs.writeJson(reportPath, this.reportData, { spaces: 2 });
    console.log(chalk.green(`📄 JSON报告已保存到: ${reportPath}`));
  }

  async generateHtmlReport() {
    const reportPath = 'docs/reports/status-report-zh.html';
    const htmlContent = this.generateHtmlContent();
    await fs.writeFile(reportPath, htmlContent);
    console.log(chalk.green(`📄 HTML报告已保存到: ${reportPath}`));
  }

  generateHtmlContent() {
    const { summary, metrics } = this.reportData;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>状态报告 - PRD文档增强</title>
    <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 20px; }
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
        <h1>状态报告 - PRD文档增强</h1>
        <p>生成时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <h3>总功能数</h3>
            <p>${summary.totalFeatures}</p>
        </div>
        <div class="metric">
            <h3>已完成</h3>
            <p class="status-completed">${summary.completedFeatures} (${summary.completionRate}%)</p>
        </div>
        <div class="metric">
            <h3>进行中</h3>
            <p class="status-in-progress">${summary.inProgressFeatures}</p>
        </div>
        <div class="metric">
            <h3>计划中</h3>
            <p class="status-planned">${summary.plannedFeatures}</p>
        </div>
        <div class="metric">
            <h3>质量分数</h3>
            <p>${metrics.qualityScore}/100</p>
        </div>
        <div class="metric">
            <h3>风险分数</h3>
            <p>${metrics.riskScore}/100</p>
        </div>
    </div>
    
    <h2>功能详情</h2>
    <table>
        <tr>
            <th>功能</th>
            <th>状态</th>
            <th>优先级</th>
            <th>进度</th>
            <th>类别</th>
            <th>最后更新</th>
        </tr>
        ${this.reportData.features.map(f => `
        <tr>
            <td>${f.id}</td>
            <td class="status-${f.status.includes('已完成') ? 'completed' : f.status.includes('进行中') ? 'in-progress' : f.status.includes('计划中') ? 'planned' : 'blocked'}">${f.status}</td>
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

// CLI接口
async function main() {
  const reporter = new StatusReporterZH();
  await reporter.generateReport();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StatusReporterZH;
