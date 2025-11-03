import { NextRequest, NextResponse } from 'next/server';

import { QualityMetric } from '@/lib/monitoring';

/**
 * 质量监控 API 端点
 * 
 * 接收和处理质量指标数据
 */

// 存储质量指标的内存缓存（生产环境应使用数据库）
const qualityMetrics: QualityMetric[] = [];

export async function POST(request: NextRequest) {
  try {
    const metric: QualityMetric = await request.json();

    // 验证数据格式
    if (!isValidQualityMetric(metric)) {
      return NextResponse.json(
        { error: 'Invalid quality metric format' },
        { status: 400 }
      );
    }

    // 存储指标
    qualityMetrics.push(metric);

    // 限制内存使用，只保留最近的1000条记录
    if (qualityMetrics.length > 1000) {
      qualityMetrics.splice(0, qualityMetrics.length - 1000);
    }

    // 检查是否需要发送警报
    if (!metric.passed) {
      await sendQualityAlert(metric);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing quality metric:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const hours = parseInt(searchParams.get('hours') || '24');

    // 过滤时间范围
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    let filteredMetrics = qualityMetrics.filter(m => m.timestamp > cutoff);

    // 按类型过滤
    if (type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === type);
    }

    // 生成统计信息
    const stats = generateQualityStats(filteredMetrics);

    return NextResponse.json({
      metrics: filteredMetrics,
      stats,
      count: filteredMetrics.length
    });
  } catch (error) {
    console.error('Error fetching quality metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidQualityMetric(metric: any): metric is QualityMetric {
  return (
    typeof metric === 'object' &&
    typeof metric.type === 'string' &&
    ['coverage', 'performance', 'security', 'accessibility', 'bundle-size'].includes(metric.type) &&
    typeof metric.score === 'number' &&
    typeof metric.threshold === 'number' &&
    typeof metric.passed === 'boolean' &&
    typeof metric.timestamp === 'number'
  );
}

function generateQualityStats(metrics: QualityMetric[]) {
  if (metrics.length === 0) {
    return {
      overall: { total: 0, passed: 0, failed: 0, passRate: 0 },
      byType: {}
    };
  }

  const overall = {
    total: metrics.length,
    passed: metrics.filter(m => m.passed).length,
    failed: metrics.filter(m => !m.passed).length,
    passRate: (metrics.filter(m => m.passed).length / metrics.length) * 100
  };

  const byType: Record<string, any> = {};
  const groupedByType = metrics.reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = [];
    }
    acc[metric.type]!.push(metric);
    return acc;
  }, {} as Record<string, QualityMetric[]>);

  Object.entries(groupedByType).forEach(([type, typeMetrics]) => {
    const scores = typeMetrics.map(m => m.score);
    byType[type] = {
      count: typeMetrics.length,
      passed: typeMetrics.filter(m => m.passed).length,
      failed: typeMetrics.filter(m => !m.passed).length,
      passRate: (typeMetrics.filter(m => m.passed).length / typeMetrics.length) * 100,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      latestScore: typeMetrics.length > 0 ? typeMetrics[typeMetrics.length - 1]?.score || 0 : 0,
      trend: calculateTrend(typeMetrics)
    };
  });

  return { overall, byType };
}

function calculateTrend(metrics: QualityMetric[]): 'improving' | 'declining' | 'stable' {
  if (metrics.length < 2) return 'stable';

  const recent = metrics.slice(-5); // 最近5个指标
  const older = metrics.slice(-10, -5); // 之前5个指标

  if (recent.length === 0 || older.length === 0) return 'stable';

  const recentAvg = recent.reduce((sum, m) => sum + (m?.score || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, m) => sum + (m?.score || 0), 0) / older.length;

  const diff = recentAvg - olderAvg;
  
  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
}

async function sendQualityAlert(metric: QualityMetric) {
  // 这里可以集成各种告警系统
  // 例如：Slack、邮件、钉钉等
  
  console.warn(`Quality Alert: ${metric.type} failed with score ${metric.score} (threshold: ${metric.threshold})`);
  
  // 示例：发送到 Slack Webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 Quality Alert: ${metric.type} failed`,
          attachments: [
            {
              color: 'danger',
              fields: [
                {
                  title: 'Type',
                  value: metric.type,
                  short: true
                },
                {
                  title: 'Score',
                  value: `${metric.score.toFixed(2)}`,
                  short: true
                },
                {
                  title: 'Threshold',
                  value: `${metric.threshold}`,
                  short: true
                },
                {
                  title: 'Time',
                  value: new Date(metric.timestamp).toISOString(),
                  short: true
                }
              ]
            }
          ]
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
}