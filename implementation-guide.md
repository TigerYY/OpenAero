# GLAD-N 网站技术实现指南

## 1. 项目初始化

### 1.1 创建Next.js项目
```bash
# 创建项目
npx create-next-app@latest glad-n-website --typescript --tailwind --eslint --app

# 进入项目目录
cd glad-n-website

# 安装依赖
npm install
```

### 1.2 安装额外依赖
```bash
# UI和动画
npm install @headlessui/react framer-motion
npm install @heroicons/react lucide-react

# 状态管理和数据获取
npm install zustand @tanstack/react-query

# 表单处理
npm install react-hook-form @hookform/resolvers zod

# 数据库和ORM
npm install prisma @prisma/client

# 工具库
npm install clsx tailwind-merge
npm install recharts

# 开发依赖
npm install -D @types/node
```

### 1.3 项目结构设置
```
glad-n-website/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (pages)/           # 页面路由组
│   │   │   ├── page.tsx       # 首页
│   │   │   ├── solutions/     # 解决方案页面
│   │   │   ├── technology/    # 核心技术页面
│   │   │   ├── partners/      # 生态伙伴页面
│   │   │   ├── developer/     # 开发者中心
│   │   │   ├── about/         # 关于我们
│   │   │   └── contact/       # 联系我们
│   │   ├── api/               # API路由
│   │   │   ├── contact/       # 联系表单API
│   │   │   └── partners/      # 合作伙伴申请API
│   │   ├── globals.css        # 全局样式
│   │   └── layout.tsx         # 根布局
│   ├── components/            # 组件库
│   │   ├── ui/               # 基础UI组件
│   │   ├── layout/           # 布局组件
│   │   ├── sections/         # 页面区块组件
│   │   ├── business/         # 业务组件
│   │   └── forms/            # 表单组件
│   ├── lib/                  # 工具函数
│   │   ├── db.ts            # 数据库连接
│   │   ├── utils.ts         # 通用工具
│   │   ├── validations.ts   # 数据验证
│   │   └── constants.ts     # 常量定义
│   ├── types/               # TypeScript类型
│   └── styles/              # 样式文件
├── prisma/                  # 数据库模式
├── public/                  # 静态资源
├── docs/                    # 项目文档
└── tests/                   # 测试文件
```

## 2. 核心配置

### 2.1 Tailwind CSS配置
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      }
    },
  },
  plugins: [],
}
export default config
```

### 2.2 数据库配置
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Contact {
  id        String   @id @default(cuid())
  name      String
  email     String
  company   String?
  phone     String?
  message   String
  createdAt DateTime @default(now())
}

model Partner {
  id        String   @id @default(cuid())
  name      String
  email     String
  company   String
  website   String?
  category  String
  message   String
  status    String   @default("pending")
  createdAt DateTime @default(now())
}

model Document {
  id          String   @id @default(cuid())
  title       String
  description String?
  fileUrl     String
  category    String
  version     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2.3 环境变量配置
```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/gladn_website"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="your-resend-api-key"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="gladn-website-assets"
NEXT_PUBLIC_SITE_URL="https://glad-n.com"
```

## 3. 核心组件实现

### 3.1 基础UI组件
```typescript
// src/components/ui/Button.tsx
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  asChild?: boolean
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  asChild = false,
  ...props 
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50",
    ghost: "hover:bg-gray-100"
  }
  
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg"
  }

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
```

### 3.2 布局组件
```typescript
// src/components/layout/MainLayout.tsx
import { Header } from './Header'
import { Footer } from './Footer'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
```

### 3.3 首页Hero区块
```typescript
// src/components/sections/HeroSection.tsx
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900">
              开放式无人机
              <span className="text-blue-600">核心套件</span>
            </h1>
            <p className="text-xl text-gray-600">
              高性能、高可靠性的无人机系统核心套件，
              赋能行业应用开发者和系统集成商
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" variant="primary">
                <Link href="/solutions">探索解决方案</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/technology">了解核心技术</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video bg-gray-200 rounded-lg">
              {/* 产品展示图片/视频 */}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

## 4. 页面实现

### 4.1 首页实现
```typescript
// src/app/(pages)/page.tsx
import { MainLayout } from '@/components/layout/MainLayout'
import { HeroSection } from '@/components/sections/HeroSection'
import { ValueFlowSection } from '@/components/sections/ValueFlowSection'
import { SolutionsSection } from '@/components/sections/SolutionsSection'
import { TransparencySection } from '@/components/sections/TransparencySection'
import { PartnersSection } from '@/components/sections/PartnersSection'

export default function HomePage() {
  return (
    <MainLayout>
      <HeroSection />
      <ValueFlowSection />
      <SolutionsSection />
      <TransparencySection />
      <PartnersSection />
    </MainLayout>
  )
}
```

### 4.2 解决方案详情页
```typescript
// src/app/(pages)/solutions/[slug]/page.tsx
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductHeader } from '@/components/business/ProductHeader'
import { ProductFeatures } from '@/components/business/ProductFeatures'
import { TechnicalSpecs } from '@/components/business/TechnicalSpecs'
import { PerformanceReport } from '@/components/business/PerformanceReport'
import { BOMList } from '@/components/business/BOMList'
import { PricingModule } from '@/components/business/PricingModule'
import { PurchaseCTA } from '@/components/business/PurchaseCTA'

interface SolutionPageProps {
  params: { slug: string }
}

export default function SolutionPage({ params }: SolutionPageProps) {
  // 根据slug获取产品数据
  const productData = getProductData(params.slug)

  return (
    <MainLayout>
      <ProductHeader {...productData} />
      <ProductFeatures features={productData.features} />
      <TechnicalSpecs specifications={productData.specifications} />
      <PerformanceReport />
      <BOMList items={productData.bomItems} />
      <PricingModule {...productData.pricing} />
      <PurchaseCTA productId={params.slug} />
    </MainLayout>
  )
}

function getProductData(slug: string) {
  // 从CMS或静态数据获取产品信息
  const products = {
    'glad-n-s1': {
      name: 'GLAD-N S1',
      type: '测绘型',
      description: '专为测绘应用优化的高性能无人机核心套件',
      features: ['RTK高精度定位', '30分钟续航', '专业测绘相机支持'],
      specifications: {
        '飞行时间': '30分钟',
        '定位精度': '±2cm',
        '最大载重': '2kg'
      },
      bomItems: [],
      pricing: {
        marketPrice: 15000,
        serviceFee: 3000,
        finalPrice: 18000
      }
    }
  }
  
  return products[slug as keyof typeof products]
}
```

## 5. API实现

### 5.1 联系表单API
```typescript
// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().min(10)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = contactSchema.parse(body)

    // 保存到数据库
    await prisma.contact.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        message: data.message
      }
    })

    // 发送邮件通知
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'noreply@glad-n.com',
      to: 'contact@glad-n.com',
      subject: '新的联系表单提交',
      html: `
        <h2>新的联系表单提交</h2>
        <p><strong>姓名:</strong> ${data.name}</p>
        <p><strong>邮箱:</strong> ${data.email}</p>
        <p><strong>公司:</strong> ${data.company || '未填写'}</p>
        <p><strong>电话:</strong> ${data.phone || '未填写'}</p>
        <p><strong>留言:</strong></p>
        <p>${data.message}</p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
```

## 6. 样式和主题

### 6.1 全局样式
```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  body {
    font-family: 'Inter', sans-serif;
  }
}

@layer components {
  .container {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
  }
  
  .section-padding {
    @apply py-16 lg:py-24;
  }
  
  .gradient-text {
    @apply bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent;
  }
}

@layer utilities {
  .animation-delay-200 {
    animation-delay: 200ms;
  }
  
  .animation-delay-400 {
    animation-delay: 400ms;
  }
}
```

## 7. 部署配置

### 7.1 Vercel配置
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 7.2 构建脚本
```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

## 8. 性能优化

### 8.1 图片优化
```typescript
// src/components/ui/OptimizedImage.tsx
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export function OptimizedImage({ src, alt, width, height, className }: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    />
  )
}
```

### 8.2 代码分割
```typescript
// src/components/lazy/LazyComponent.tsx
import dynamic from 'next/dynamic'

export const LazyChart = dynamic(() => import('./Chart'), {
  loading: () => <div className="h-64 bg-gray-200 animate-pulse rounded" />,
  ssr: false
})
```

## 9. SEO优化

### 9.1 元数据配置
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'GLAD-N 开放式无人机解决方案',
    template: '%s | GLAD-N'
  },
  description: '高性能、高可靠性的无人机系统核心套件，赋能行业应用开发者和系统集成商',
  keywords: ['无人机', '核心套件', '开源', '测绘', '安防'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://glad-n.com',
    siteName: 'GLAD-N',
    title: 'GLAD-N 开放式无人机解决方案',
    description: '高性能、高可靠性的无人机系统核心套件',
  }
}
```

### 9.2 页面级SEO
```typescript
// src/app/(pages)/solutions/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = getProductData(params.slug)
  
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    }
  }
}
```

## 10. 测试配置

### 10.1 单元测试
```typescript
// tests/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### 10.2 E2E测试
```typescript
// tests/e2e/contact-form.spec.ts
import { test, expect } from '@playwright/test'

test('contact form submission', async ({ page }) => {
  await page.goto('/contact')
  
  await page.fill('[name="name"]', 'Test User')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="message"]', 'Test message')
  
  await page.click('button[type="submit"]')
  
  await expect(page.locator('.success-message')).toBeVisible()
})
```

这个实现指南提供了完整的GLAD-N网站技术实现方案，包括项目初始化、核心组件、页面实现、API设计、部署配置等各个方面，为开发团队提供了详细的实施指导。
