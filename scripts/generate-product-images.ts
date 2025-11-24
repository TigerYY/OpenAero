/**
 * 为产品生成占位图片
 * 使用 SVG 格式创建简单的产品占位图
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// 产品列表（从数据库获取）
const products = [
  {
    slug: 'f20-a-overseas',
    name: '20L植保无人机 F20-A系列（海外版）',
    series: 'F20-A',
    capacity: '20L',
  },
  {
    slug: 'f20-a-domestic',
    name: '20L植保无人机 F20-A系列（国内版）',
    series: 'F20-A',
    capacity: '20L',
  },
  {
    slug: 'f20-b-overseas',
    name: '20L植保无人机 F20-B系列（海外版）',
    series: 'F20-B',
    capacity: '20L',
  },
  {
    slug: 'f20-b-domestic',
    name: '20L植保无人机 F20-B系列（国内版）',
    series: 'F20-B',
    capacity: '20L',
  },
  {
    slug: 'f30-a-overseas',
    name: '30L植保无人机 F30-A系列（海外版）',
    series: 'F30-A',
    capacity: '30L',
  },
  {
    slug: 'f30-a-domestic',
    name: '30L植保无人机 F30-A系列（国内版）',
    series: 'F30-A',
    capacity: '30L',
  },
  {
    slug: 'f30-b-overseas',
    name: '30L植保无人机 F30-B系列（海外版）',
    series: 'F30-B',
    capacity: '30L',
  },
  {
    slug: 'f30-b-domestic',
    name: '30L植保无人机 F30-B系列（国内版）',
    series: 'F30-B',
    capacity: '30L',
  },
];

// 创建图片目录
const imagesDir = resolve(process.cwd(), 'public/images/products');
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

/**
 * 生成 SVG 占位图
 */
function generateSVGPlaceholder(
  slug: string,
  name: string,
  series: string,
  capacity: string,
  index: number
): string {
  const colors = [
    { bg: '#3B82F6', text: '#FFFFFF' }, // 蓝色
    { bg: '#10B981', text: '#FFFFFF' }, // 绿色
    { bg: '#F59E0B', text: '#FFFFFF' }, // 橙色
    { bg: '#8B5CF6', text: '#FFFFFF' }, // 紫色
  ];

  const color = colors[index % colors.length];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="800" height="600" fill="${color.bg}"/>
  
  <!-- 渐变遮罩 -->
  <defs>
    <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.1);stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#grad${index})"/>
  
  <!-- 无人机图标（简化版） -->
  <g transform="translate(400, 200)">
    <!-- 主体 -->
    <ellipse cx="0" cy="0" rx="120" ry="80" fill="rgba(255,255,255,0.2)" stroke="${color.text}" stroke-width="3"/>
    <!-- 旋翼臂 -->
    <line x1="-80" y1="-40" x2="-120" y2="-80" stroke="${color.text}" stroke-width="4" stroke-linecap="round"/>
    <line x1="80" y1="-40" x2="120" y2="-80" stroke="${color.text}" stroke-width="4" stroke-linecap="round"/>
    <line x1="-80" y1="40" x2="-120" y2="80" stroke="${color.text}" stroke-width="4" stroke-linecap="round"/>
    <line x1="80" y1="40" x2="120" y2="80" stroke="${color.text}" stroke-width="4" stroke-linecap="round"/>
    <!-- 旋翼 -->
    <circle cx="-120" cy="-80" r="25" fill="rgba(255,255,255,0.3)" stroke="${color.text}" stroke-width="2"/>
    <circle cx="120" cy="-80" r="25" fill="rgba(255,255,255,0.3)" stroke="${color.text}" stroke-width="2"/>
    <circle cx="-120" cy="80" r="25" fill="rgba(255,255,255,0.3)" stroke="${color.text}" stroke-width="2"/>
    <circle cx="120" cy="80" r="25" fill="rgba(255,255,255,0.3)" stroke="${color.text}" stroke-width="2"/>
  </g>
  
  <!-- 文字信息 -->
  <text x="400" y="450" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="${color.text}" text-anchor="middle">
    ${series}
  </text>
  <text x="400" y="490" font-family="Arial, sans-serif" font-size="24" fill="${color.text}" text-anchor="middle">
    ${capacity}
  </text>
  <text x="400" y="530" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
    ${name.split('（')[1]?.replace('）', '') || ''}
  </text>
</svg>`;
}

/**
 * 生成所有产品的占位图
 */
function generateAllPlaceholders() {
  console.log('开始生成产品占位图片...\n');

  products.forEach((product, index) => {
    // 生成两张图片（主图和副图）
    for (let i = 1; i <= 2; i++) {
      const filename = `${product.slug}-${i}.svg`;
      const filepath = resolve(imagesDir, filename);

      const svg = generateSVGPlaceholder(
        product.slug,
        product.name,
        product.series,
        product.capacity,
        index * 2 + i - 1
      );

      writeFileSync(filepath, svg, 'utf-8');
      console.log(`✅ 已生成: ${filename}`);
    }
  });

  console.log(`\n✅ 共生成 ${products.length * 2} 张占位图片`);
  console.log(`📁 图片目录: ${imagesDir}`);
  console.log('\n💡 提示: 这些是 SVG 占位图，后续可以替换为实际的产品照片');
}

// 执行生成
generateAllPlaceholders();
