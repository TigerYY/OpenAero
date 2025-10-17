# OpenAero 项目结构规范

## 📁 目录结构

```
openaero.web/
├── src/                          # 源代码目录
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 路由
│   │   ├── solutions/            # 解决方案页面
│   │   ├── creators/             # 创作者页面
│   │   ├── layout.tsx            # 根布局
│   │   ├── page.tsx              # 首页
│   │   └── globals.css           # 全局样式
│   ├── components/               # 组件目录
│   │   ├── ui/                   # 基础UI组件
│   │   ├── business/             # 业务组件
│   │   └── layout/               # 布局组件
│   ├── lib/                      # 工具库
│   │   ├── db.ts                 # 数据库连接
│   │   ├── utils.ts              # 工具函数
│   │   └── validations.ts        # 数据验证
│   └── types/                    # TypeScript 类型定义
├── prisma/                       # 数据库模式
├── scripts/                      # 脚本文件
│   ├── dev.sh                    # 开发服务器
│   ├── dev-optimized.sh          # 优化开发服务器
│   └── check-project.sh          # 项目健康检查
├── tests/                        # 测试文件
├── docs/                         # 文档目录
├── package.json                  # 项目配置
├── next.config.js                # Next.js 配置
├── tailwind.config.js            # Tailwind 配置
├── tsconfig.json                 # TypeScript 配置
└── .env.local                    # 环境变量
```

## 🚀 开发流程

### 1. 启动开发服务器
```bash
# 使用优化脚本（推荐）
./scripts/dev-optimized.sh

# 或直接使用 npm
npm run dev
```

### 2. 项目健康检查
```bash
./scripts/check-project.sh
```

### 3. 构建项目
```bash
npm run build
```

## ⚡ 性能优化

### 1. 编译优化
- 启用 SWC 编译器
- 优化包导入
- 启用 CSS 优化

### 2. 开发环境优化
- 增加 Node.js 内存限制
- 禁用遥测
- 优化文件监听

### 3. 构建优化
- 启用压缩
- 优化图片处理
- 减少 bundle 大小

## 🔧 配置管理

### 1. 环境变量
- 开发环境：`.env.local`
- 生产环境：通过部署平台配置

### 2. 依赖管理
- 生产依赖：只包含运行时必需的包
- 开发依赖：包含构建和测试工具

### 3. 代码质量
- ESLint：代码规范检查
- Prettier：代码格式化
- TypeScript：类型检查

## 📝 命名规范

### 1. 文件命名
- 组件：PascalCase (如 `SolutionCard.tsx`)
- 页面：kebab-case (如 `solutions/page.tsx`)
- 工具函数：camelCase (如 `utils.ts`)

### 2. 目录命名
- 全部小写
- 使用连字符分隔 (如 `business-components`)

### 3. 变量命名
- 组件：PascalCase
- 函数/变量：camelCase
- 常量：UPPER_SNAKE_CASE

## 🚨 常见问题

### 1. 编译缓慢
- 使用 `./scripts/dev-optimized.sh`
- 检查依赖是否过多
- 清理 `.next` 缓存

### 2. 目录错误
- 始终使用绝对路径
- 使用项目根目录的脚本
- 检查 `pwd` 命令确认位置

### 3. 样式问题
- 检查 Tailwind 配置
- 确认 CSS 类名正确
- 使用 JIT 模式

## 📊 性能指标

### 目标指标
- 首次编译：< 3秒
- 热重载：< 1秒
- 构建时间：< 30秒
- Bundle 大小：< 500KB

### 监控方法
```bash
# 检查编译时间
npm run build

# 检查依赖大小
npm ls --depth=0

# 检查端口占用
lsof -i :3000
```
