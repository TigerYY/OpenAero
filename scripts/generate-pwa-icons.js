#!/usr/bin/env node

/**
 * PWA 图标生成脚本
 * 基于现有的 logo 文件生成不同尺寸的 PWA 图标
 */

const fs = require('fs');
const path = require('path');

// 图标尺寸配置
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// 创建简单的 SVG 图标作为占位符
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">OA</text>
</svg>`;
}

// 创建快捷方式图标
function createShortcutIcon(name, size = 96) {
  const icons = {
    'solutions': '🚁',
    'creator': '✏️',
    'orders': '📋'
  };
  
  const emoji = icons[name] || '📱';
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#f3f4f6" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-size="${size * 0.5}" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>`;
}

// 生成图标文件
function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  
  // 确保目录存在
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 生成 PWA 图标...');

  // 生成主图标
  iconSizes.forEach(size => {
    const svgContent = createSVGIcon(size);
    const filename = `icon-${size}x${size}.png`;
    const svgFilename = `icon-${size}x${size}.svg`;
    
    // 保存 SVG 文件（作为占位符）
    fs.writeFileSync(path.join(iconsDir, svgFilename), svgContent);
    console.log(`✅ 生成 ${svgFilename}`);
  });

  // 生成快捷方式图标
  const shortcuts = ['solutions', 'creator', 'orders'];
  shortcuts.forEach(shortcut => {
    const svgContent = createShortcutIcon(shortcut);
    const filename = `shortcut-${shortcut}.svg`;
    
    fs.writeFileSync(path.join(iconsDir, filename), svgContent);
    console.log(`✅ 生成 ${filename}`);
  });

  console.log('\n📝 注意：');
  console.log('- 当前生成的是 SVG 占位符图标');
  console.log('- 建议使用专业工具将 SVG 转换为 PNG 格式');
  console.log('- 或者替换为实际的品牌图标文件');
  console.log('- 图标应该遵循 PWA 图标设计规范');
}

// 生成截图占位符
function generateScreenshots() {
  const screenshotsDir = path.join(__dirname, '../public/screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('\n📸 生成截图占位符...');

  // 桌面版截图
  const desktopSVG = `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="0" y="0" width="1280" height="80" fill="#2563eb"/>
  <text x="640" y="45" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">OpenAero - 无人机解决方案平台</text>
  <text x="640" y="360" font-family="Arial, sans-serif" font-size="48" fill="#1f2937" text-anchor="middle">桌面版首页</text>
  <text x="640" y="420" font-family="Arial, sans-serif" font-size="20" fill="#6b7280" text-anchor="middle">专业的无人机解决方案创作与交易平台</text>
</svg>`;

  // 移动版截图
  const mobileSVG = `<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="844" fill="#f8fafc"/>
  <rect x="0" y="0" width="390" height="60" fill="#2563eb"/>
  <text x="195" y="35" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">OpenAero</text>
  <text x="195" y="422" font-family="Arial, sans-serif" font-size="24" fill="#1f2937" text-anchor="middle">移动版首页</text>
  <text x="195" y="460" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">无人机解决方案平台</text>
</svg>`;

  fs.writeFileSync(path.join(screenshotsDir, 'desktop-home.svg'), desktopSVG);
  fs.writeFileSync(path.join(screenshotsDir, 'mobile-home.svg'), mobileSVG);
  
  console.log('✅ 生成 desktop-home.svg');
  console.log('✅ 生成 mobile-home.svg');
  
  console.log('\n📝 注意：');
  console.log('- 截图应该展示应用的实际界面');
  console.log('- 建议使用真实的应用截图替换占位符');
  console.log('- 截图有助于用户了解应用功能');
}

// 主函数
function main() {
  console.log('🚀 开始生成 PWA 资源文件...\n');
  
  generateIcons();
  generateScreenshots();
  
  console.log('\n✨ PWA 资源文件生成完成！');
  console.log('\n下一步：');
  console.log('1. 将 SVG 文件转换为对应的 PNG 格式');
  console.log('2. 替换为实际的品牌图标和应用截图');
  console.log('3. 在 HTML 中添加 manifest.json 链接');
  console.log('4. 测试 PWA 安装功能');
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateIcons,
  generateScreenshots
};