# OpenAero 项目标准化规范

## 🎯 **遵循的行业标准**

### 1. **Node.js 项目结构标准**
```
openaero.web/
├── scripts/                 # 构建和开发脚本
│   ├── start-dev.js        # 标准化开发启动脚本
│   ├── clean-ports.js      # 端口清理脚本
│   └── check-environment.sh # 环境检查脚本
├── src/                    # 源代码目录
├── public/                 # 静态资源
├── messages/               # 国际化文件
├── package.json           # 项目配置
├── next.config.js         # Next.js配置
├── tsconfig.json          # TypeScript配置
└── .env.local             # 环境变量
```

### 2. **脚本标准化原则**

#### ✅ **推荐做法**
- 使用相对路径：`./scripts/start-dev.js`
- 使用环境变量：`PORT=3000 node scripts/start-dev.js`
- 使用 `__dirname` 获取脚本目录
- 使用 `process.cwd()` 获取当前工作目录
- 使用 `path.resolve()` 构建绝对路径

#### ❌ **避免做法**
- 硬编码绝对路径
- 依赖特定工作目录
- 使用复杂的路径拼接

### 3. **启动脚本标准**

#### 标准启动命令
```bash
# 开发环境（默认端口3000）
npm run dev

# 指定端口
npm run dev:3000
npm run dev:3001

# 使用启动脚本
./start-dev.sh
```

#### 环境变量支持
```bash
# 通过环境变量指定端口
PORT=3001 npm run dev

# 通过环境变量指定主机
HOST=0.0.0.0 npm run dev
```

### 4. **工作目录处理标准**

#### 自动目录检测
```javascript
// 获取项目根目录（脚本所在目录的父目录）
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 确保在正确目录
if (process.cwd() !== PROJECT_ROOT) {
  process.chdir(PROJECT_ROOT);
}
```

#### 文件存在性验证
```javascript
const requiredFiles = ['package.json', 'next.config.js'];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(PROJECT_ROOT, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}
```

### 5. **端口管理标准**

#### 端口检查
```javascript
function checkPort(port) {
  const command = process.platform === 'win32' 
    ? `netstat -ano | findstr :${port}`
    : `lsof -ti:${port}`;
  // ... 实现
}
```

#### 端口清理
```javascript
async function cleanupPort(port) {
  const portStatus = await checkPort(port);
  if (portStatus.occupied) {
    // 杀死占用进程
    await killProcess(portStatus.pid);
  }
}
```

### 6. **进程管理标准**

#### 优雅退出
```javascript
const cleanup = () => {
  devProcess.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
```

#### 错误处理
```javascript
devProcess.on('error', (error) => {
  console.error('启动失败:', error.message);
  process.exit(1);
});
```

### 7. **部署兼容性**

#### 生产环境
- 使用 `npm run build` 构建
- 使用 `npm start` 启动生产服务器
- 支持 `PORT` 环境变量

#### 开发环境
- 使用 `npm run dev` 启动开发服务器
- 自动端口清理和重启
- 支持热重载

### 8. **跨平台兼容性**

#### Windows 支持
```javascript
const isWindows = process.platform === 'win32';
const command = isWindows ? 'taskkill /PID' : 'kill -9';
```

#### 路径处理
```javascript
const path = require('path');
const filePath = path.join(PROJECT_ROOT, 'package.json');
```

## 🚀 **使用指南**

### 开发环境启动
```bash
# 方式1：使用npm脚本（推荐）
npm run dev

# 方式2：使用启动脚本
./start-dev.sh

# 方式3：直接运行
node scripts/start-dev.js
```

### 环境检查
```bash
# 检查开发环境
./scripts/check-environment.sh

# 验证配置
npm run config:validate
```

## 📋 **最佳实践总结**

1. **始终使用相对路径**
2. **通过环境变量配置**
3. **自动检测和修复工作目录**
4. **优雅处理进程退出**
5. **跨平台兼容性**
6. **生产环境友好**
7. **遵循Node.js社区标准**

这套方案完全遵循Node.js和Next.js的行业标准，确保项目在任何环境下都能稳定运行。
