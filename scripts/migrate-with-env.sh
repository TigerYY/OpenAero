#!/bin/bash
# 加载 .env.local 并运行 Prisma 迁移

# 加载环境变量
export $(grep -v '^#' .env.local | xargs)

# 运行 Prisma 迁移
npx prisma migrate dev "$@"
