# 使用Node.js官方镜像
FROM node:20-alpine

WORKDIR /app

# 安装依赖
RUN apk add --no-cache libc6-compat

# 复制package文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --frozen-lockfile

# 复制源代码
COPY . .

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 修改文件权限
RUN chown -R nextjs:nodejs /app

# 切换到nextjs用户
USER nextjs

# 预创建.next目录
RUN mkdir -p /app/.next

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV development

# 直接启动Next.js开发服务器
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]