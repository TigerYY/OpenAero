# AI 图片生成脚本使用说明

## 功能说明

`generate-drone-images-ai.ts` 脚本可以自动为每个无人机解决方案生成对应的AI图片，并保存到本地，然后更新数据库。

## 支持的AI服务

1. **OpenAI DALL-E 3** (推荐)
   - 高质量图片生成
   - 需要 OpenAI API 密钥

2. **Stability AI**
   - 开源模型
   - 需要 Stability AI API 密钥

3. **Replicate**
   - 多种模型可选
   - 需要 Replicate API 密钥

## 配置步骤

### 1. 获取 API 密钥

#### OpenAI DALL-E (推荐)
1. 访问 https://platform.openai.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API 密钥
5. 复制密钥（格式：`sk-...`）

#### Stability AI
1. 访问 https://platform.stability.ai/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API 密钥

#### Replicate
1. 访问 https://replicate.com/
2. 注册/登录账号
3. 进入 API Tokens 页面
4. 创建新的 API Token

### 2. 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
# 选择使用的AI服务（可选，默认使用 openai）
AI_IMAGE_PROVIDER=openai

# OpenAI DALL-E 配置
OPENAI_API_KEY=sk-your-openai-api-key-here

# 或者使用 Stability AI
# STABILITY_API_KEY=your-stability-api-key-here

# 或者使用 Replicate
# REPLICATE_API_KEY=your-replicate-api-key-here
```

### 3. 运行脚本

```bash
npx tsx scripts/generate-drone-images-ai.ts
```

## 脚本功能

1. **自动生成图片**：为每个解决方案生成对应的无人机图片
2. **保存到本地**：图片保存到 `public/images/solutions/` 目录
3. **更新数据库**：自动更新数据库中的图片URL
4. **错误处理**：如果某个图片生成失败，会跳过并继续处理下一个

## 生成的图片

- 图片格式：JPG
- 图片尺寸：1024x1024 (OpenAI) 或 16:9 (Stability AI)
- 保存位置：`public/images/solutions/{solution-id}-{timestamp}.jpg`
- 数据库更新：自动更新 `Solution` 表的 `images` 字段

## 注意事项

1. **API 费用**：使用 AI 生成图片会产生费用，请查看各服务的定价
2. **速率限制**：脚本在每次生成后会等待 2 秒，避免触发 API 速率限制
3. **图片质量**：生成的图片质量取决于使用的 AI 服务和提示词
4. **网络连接**：需要稳定的网络连接来调用 API 和下载图片

## 提示词说明

每个解决方案都有对应的英文提示词，用于生成相关的无人机图片：

- 农业植保：农业无人机喷洒农药
- 电力巡检：工业巡检无人机
- 测绘地理：测绘无人机
- 影视航拍：专业航拍无人机
- 应急救援：救援无人机
- 环境监测：环境监测无人机
- 交通监控：交通监控无人机
- 边境巡逻：边境巡逻无人机
- 物流配送：配送无人机
- 森林防火：森林防火无人机

## 故障排除

### 错误：未配置AI图片生成API密钥
- 检查 `.env.local` 文件中是否添加了 API 密钥
- 确保环境变量名称正确

### 错误：API调用失败
- 检查 API 密钥是否有效
- 检查网络连接
- 查看 API 服务的状态页面

### 图片生成失败
- 检查 API 配额是否充足
- 查看控制台错误信息
- 尝试使用其他 AI 服务

## 示例输出

```
开始使用 openai 生成无人机图片...

正在生成: 农业植保无人机解决方案...
  提示词: Professional agricultural drone spraying pesticides over green farmland...
  ✓ 已生成并保存: /images/solutions/cmi7gq23a0005l0yxdol1o3ki-1234567890.jpg
  等待2秒...

正在生成: 电力巡检无人机解决方案...
  ...
```

## 后续步骤

生成完成后：
1. 刷新浏览器页面查看新图片
2. 如果图片不满意，可以重新运行脚本（会生成新的图片）
3. 可以手动编辑提示词来调整生成的图片风格

