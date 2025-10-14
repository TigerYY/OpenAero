# OpenAero - 社区驱动的开放式无人机解决方案平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/website-openaero.cn-green.svg)](https://openaero.cn)
[![ICP](https://img.shields.io/badge/ICP-粤ICP备2020099654号--3-red.svg)](https://beian.miit.gov.cn/)

## 🚁 项目简介

OpenAero 是一个社区驱动的开放式无人机解决方案平台，连接全球无人机创作者与专业客户。我们致力于将优秀的无人机创新设计进行专业验证、生产和销售，为创作者提供70%的利润分成，为客户提供经过认证的高性能无人机核心套件。

## ✨ 核心特性

- **🎯 双端价值主张**: 同时服务创作者和客户
- **🔍 解决方案市场**: 展示经过认证的无人机核心套件
- **👨‍💻 创作者中心**: 提供完整的商业化支持
- **✅ 认证标准**: 严格的性能验证和质量保证
- **🤝 生态伙伴**: 与供应链顶尖伙伴深度合作
- **📚 开发者中心**: 提供技术文档和开发支持

## 🌐 在线访问

- **官方网站**: [https://openaero.cn](https://openaero.cn)
- **备案信息**: 粤ICP备2020099654号-3

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS + Headless UI
- **动画**: Framer Motion
- **图表**: Chart.js
- **状态管理**: Zustand
- **类型检查**: TypeScript

### 后端技术栈
- **运行时**: Node.js 18+
- **API**: Next.js API Routes
- **数据库**: PostgreSQL + Prisma ORM
- **文件存储**: AWS S3 / 阿里云OSS
- **邮件服务**: Resend / SendGrid

### 部署与运维
- **部署平台**: Vercel
- **CDN**: Cloudflare
- **监控**: Vercel Analytics + Google Analytics 4
- **SSL证书**: Let's Encrypt

## 📁 项目结构

```
openaero.web/
├── src/                    # 源代码目录
│   ├── app/               # Next.js App Router
│   ├── components/        # 可复用组件
│   ├── lib/              # 工具函数
│   └── types/            # TypeScript类型
├── public/               # 静态资源
├── docs/                 # 项目文档
├── logo/                 # Logo文件
├── index.html            # 当前静态版本
├── deploy.sh             # 部署脚本
├── setup-server.sh       # 服务器配置脚本
└── README.md            # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 本地开发
```bash
# 克隆项目
git clone https://github.com/your-username/openaero.web.git

# 进入项目目录
cd openaero.web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 部署到服务器
```bash
# 配置服务器环境
./setup-server.sh

# 部署网站
./deploy.sh
```

## 📋 功能模块

### 1. 解决方案市场
- 展示所有经过认证的无人机核心套件
- 支持多维度筛选和排序
- 详细的产品信息和技术规格
- 公开的BOM清单和透明定价

### 2. 创作者中心
- 70%利润分成的创作者计划
- 从方案提交到收益获取的完整流程
- 专业验证和生产支持
- 全球渠道销售

### 3. 认证标准
- 超过50项实验室和外场测试
- 性能验证报告
- 安全性和可靠性保证
- "OpenAero Certified"品牌标准

### 4. 生态伙伴
- 与T-Motor、CUAV、Holybro等顶级供应商合作
- 共赢的开放生态模式
- 优质产品集成

### 5. 开发者中心
- 详尽的技术文档
- 二次开发指南
- 社区支持
- SDK和工具下载

## 🔧 开发指南

### 组件开发
项目采用分层组件架构：
- **页面组件**: 完整的页面实现
- **布局组件**: 页面布局和结构
- **区块组件**: 页面功能区块
- **业务组件**: 特定业务逻辑组件
- **UI组件**: 基础UI组件

### 样式规范
- 使用 Tailwind CSS 进行样式开发
- 遵循响应式设计原则
- 保持设计系统的一致性

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 规范
- 编写清晰的注释和文档

## 📊 性能优化

- **静态生成**: 使用 Next.js SSG 预渲染页面
- **图片优化**: 自动优化和懒加载
- **代码分割**: 按需加载组件
- **CDN加速**: 使用 Cloudflare CDN
- **缓存策略**: 多层缓存优化

## 🔒 安全措施

- **HTTPS**: 全站SSL加密
- **安全头**: 配置完整的安全头
- **输入验证**: 服务端数据验证
- **速率限制**: 防止暴力攻击
- **数据保护**: 敏感数据加密存储

## 📈 项目状态

### 已完成
- ✅ 网站主页面开发
- ✅ 响应式设计实现
- ✅ ICP备案信息配置
- ✅ SSL证书配置
- ✅ 服务器环境搭建
- ✅ 技术架构设计

### 进行中
- 🚧 Next.js应用开发
- 🚧 数据库集成
- 🚧 API接口开发

### 计划中
- ⏳ 创作者管理系统
- ⏳ 内容管理系统
- ⏳ 支付系统集成

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- **邮箱**: contact@openaero.cn
- **网站**: [https://openaero.cn](https://openaero.cn)
- **备案**: 粤ICP备2020099654号-3

## 🙏 致谢

感谢所有为 OpenAero 项目做出贡献的开发者和社区成员！

---

**OpenAero** - 让每一个伟大的无人机创意都能轻松地变为可靠的产品，并走向全球。
