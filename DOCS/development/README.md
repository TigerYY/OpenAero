# Development Guide

This guide covers the development workflow, architecture, and best practices for the OpenAero Web application.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Database](#database)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Authentication](#authentication)
- [State Management](#state-management)
- [Performance](#performance)
- [Security](#security)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- PostgreSQL 14+
- Redis 6+
- Git

### Local Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/openaero/web.git
cd openaero-web
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your local configuration:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/openaero_dev"
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional for development)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

4. **Set up the database:**
```bash
# Create database
createdb openaero_dev

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

5. **Start development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript type checking

# Database
npm run db:migrate   # Run database migrations
npm run db:rollback  # Rollback last migration
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database (drop, create, migrate, seed)
npm run db:studio    # Open Prisma Studio

# Testing
npm run test         # Run all tests
npm run test:unit    # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e     # Run E2E tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Code Quality
npm run format       # Format code with Prettier
npm run analyze      # Analyze bundle size
npm run security     # Run security audit
```

## Project Structure

```
openaero-web/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── (auth)/            # Auth route group
│   │   ├── (dashboard)/       # Dashboard route group
│   │   ├── api/               # API routes
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components
│   │   └── features/         # Feature-specific components
│   ├── lib/                  # Utility libraries
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── database.ts       # Database utilities
│   │   ├── redis.ts          # Redis utilities
│   │   ├── email.ts          # Email utilities
│   │   ├── storage.ts        # File storage utilities
│   │   ├── seo.ts            # SEO utilities
│   │   └── utils.ts          # General utilities
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript type definitions
│   ├── styles/               # Styling files
│   └── middleware.ts         # Next.js middleware
├── prisma/                   # Database schema and migrations
│   ├── schema.prisma         # Prisma schema
│   ├── migrations/           # Database migrations
│   └── seed.ts              # Database seeding
├── public/                   # Static assets
├── tests/                    # Test files
│   ├── __mocks__/           # Test mocks
│   ├── setup/               # Test setup files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── docs/                     # Documentation
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── jest.config.js          # Jest configuration
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Custom components
- **State Management**: Zustand + React Query
- **Testing**: Jest + React Testing Library + Playwright
- **Deployment**: Vercel (recommended) or Docker

### Architecture Patterns

#### Layered Architecture

```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│         (React Components)          │
├─────────────────────────────────────┤
│            Business Layer           │
│         (Custom Hooks/Utils)        │
├─────────────────────────────────────┤
│             Data Layer              │
│        (API Routes/Prisma)          │
├─────────────────────────────────────┤
│          Infrastructure             │
│      (Database/Redis/External)      │
└─────────────────────────────────────┘
```

#### Component Architecture

```typescript
// Feature-based component structure
components/
├── ui/                    # Base components (Button, Input, etc.)
├── forms/                 # Form components
├── layout/                # Layout components (Header, Sidebar, etc.)
└── features/              # Feature-specific components
    ├── auth/              # Authentication components
    ├── dashboard/         # Dashboard components
    ├── projects/          # Project management components
    └── settings/          # Settings components
```

## Development Workflow

### Git Workflow

We use Git Flow with the following branches:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `release/*` - Release preparation branches
- `hotfix/*` - Critical bug fixes

#### Branch Naming Convention

```bash
feature/user-authentication
feature/project-dashboard
bugfix/login-validation
hotfix/security-patch
```

#### Commit Message Convention

We follow Conventional Commits:

```bash
feat: add user authentication
fix: resolve login validation issue
docs: update API documentation
style: format code with prettier
refactor: restructure user service
test: add unit tests for auth service
chore: update dependencies
```

### Development Process

1. **Create feature branch:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

2. **Develop and test:**
```bash
# Make changes
npm run lint
npm run type-check
npm run test
```

3. **Commit changes:**
```bash
git add .
git commit -m "feat: add your feature description"
```

4. **Push and create PR:**
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

5. **Code review and merge:**
- Code review by team members
- Automated tests pass
- Merge to develop branch

### Code Review Guidelines

#### What to Look For

- **Functionality**: Does the code work as expected?
- **Performance**: Are there any performance issues?
- **Security**: Are there security vulnerabilities?
- **Maintainability**: Is the code readable and maintainable?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code properly documented?

#### Review Checklist

- [ ] Code follows project conventions
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Input validation is present
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No sensitive data is exposed
- [ ] Performance considerations are addressed

## Coding Standards

### TypeScript Guidelines

#### Type Definitions

```typescript
// Use interfaces for object shapes
interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

// Use types for unions and computed types
type UserRole = 'ADMIN' | 'USER' | 'MODERATOR'
type UserWithProjects = User & {
  projects: Project[]
}

// Use enums for constants
enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}
```

#### Function Types

```typescript
// Use function declarations for named functions
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Use arrow functions for callbacks and short functions
const filterActiveItems = (items: Item[]) => 
  items.filter(item => item.status === 'ACTIVE')

// Use generic types for reusable functions
function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    data,
    message,
    success: true,
    timestamp: new Date().toISOString()
  }
}
```

### React Guidelines

#### Component Structure

```typescript
// Component file structure
import React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import type { User } from '@/types/user'

interface UserProfileProps {
  userId: string
  onUpdate?: (user: User) => void
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { user, updateUser, isLoading } = useUser(userId)

  useEffect(() => {
    // Side effects here
  }, [userId])

  const handleSave = async (data: Partial<User>) => {
    try {
      const updatedUser = await updateUser(data)
      onUpdate?.(updatedUser)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  )
}
```

#### Hooks Guidelines

```typescript
// Custom hook example
export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      const userData = await response.json()
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const updateUser = useCallback(async (data: Partial<User>) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const updatedUser = await response.json()
    setUser(updatedUser)
    return updatedUser
  }, [userId])

  return { user, isLoading, error, updateUser, refetch: fetchUser }
}
```

### CSS/Styling Guidelines

#### Tailwind CSS Usage

```typescript
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <Button className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700">
    Action
  </Button>
</div>

// Use CSS variables for custom properties
<div className="bg-primary text-primary-foreground">
  Content
</div>
```

#### Component Styling

```typescript
// Use cn utility for conditional classes
import { cn } from '@/lib/utils'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  )
}
```

## Testing

### Testing Strategy

#### Test Pyramid

```
        ┌─────────────┐
        │     E2E     │  ← Few, high-level tests
        │   Tests     │
        ├─────────────┤
        │ Integration │  ← Some, API and component integration
        │   Tests     │
        ├─────────────┤
        │    Unit     │  ← Many, fast and isolated
        │   Tests     │
        └─────────────┘
```

#### Unit Tests

```typescript
// Example unit test
import { calculateTotal } from '@/lib/utils'

describe('calculateTotal', () => {
  it('should calculate total price correctly', () => {
    const items = [
      { id: '1', price: 10, quantity: 2 },
      { id: '2', price: 15, quantity: 1 }
    ]
    
    expect(calculateTotal(items)).toBe(35)
  })

  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0)
  })

  it('should handle items with zero quantity', () => {
    const items = [
      { id: '1', price: 10, quantity: 0 }
    ]
    
    expect(calculateTotal(items)).toBe(0)
  })
})
```

#### Component Tests

```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react'
import { UserProfile } from '@/components/user-profile'

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
}

describe('UserProfile', () => {
  it('should render user information', () => {
    render(<UserProfile user={mockUser} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = jest.fn()
    render(<UserProfile user={mockUser} onEdit={onEdit} />)
    
    fireEvent.click(screen.getByText('Edit'))
    expect(onEdit).toHaveBeenCalledWith(mockUser)
  })
})
```

#### Integration Tests

```typescript
// Example API integration test
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/users/route'

describe('/api/users', () => {
  it('should return users list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.users).toBeDefined()
    expect(Array.isArray(data.users)).toBe(true)
  })
})
```

#### E2E Tests

```typescript
// Example E2E test
import { test, expect } from '@playwright/test'

test.describe('User Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })
})
```

### Test Configuration

#### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

## Database

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects Project[]
  sessions Session[]

  @@map("users")
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(DRAFT)
  userId      String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("projects")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name add-user-projects

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

### Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: await bcrypt.hash('admin123', 12),
    },
  })

  // Create test projects
  await prisma.project.createMany({
    data: [
      {
        name: 'Test Project 1',
        description: 'First test project',
        userId: adminUser.id,
        status: 'ACTIVE',
      },
      {
        name: 'Test Project 2',
        description: 'Second test project',
        userId: adminUser.id,
        status: 'DRAFT',
      },
    ],
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## API Development

### API Route Structure

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count()

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, role } = body

    // Validation
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### API Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // API routes middleware
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth routes
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // Check authentication for protected API routes
    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add user info to headers
    const response = NextResponse.next()
    response.headers.set('x-user-id', token.sub || '')
    response.headers.set('x-user-role', token.role || 'USER')
    
    return response
  }

  // Protected pages middleware
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
}
```

## Frontend Development

### Component Development

#### Base Components

```typescript
// components/ui/button.tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

#### Form Components

```typescript
// components/forms/user-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']),
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSubmit: (data: UserFormData) => Promise<void>
  isLoading?: boolean
}

export function UserForm({ initialData, onSubmit, isLoading }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: initialData,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          {...register('role')}
          className="w-full p-2 border rounded-md"
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="MODERATOR">Moderator</option>
        </select>
        {errors.role && (
          <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || isLoading}
        className="w-full"
      >
        {isSubmitting || isLoading ? 'Saving...' : 'Save User'}
      </Button>
    </form>
  )
}
```

### State Management

#### Zustand Store

```typescript
// lib/store/user-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User) => void
  clearUser: () => void
  updateUser: (updates: Partial<User>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        error: null,

        setUser: (user) => set({ user, error: null }),
        clearUser: () => set({ user: null, error: null }),
        updateUser: (updates) => {
          const currentUser = get().user
          if (currentUser) {
            set({ user: { ...currentUser, ...updates } })
          }
        },
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({ user: state.user }),
      }
    ),
    { name: 'user-store' }
  )
)
```

#### React Query Integration

```typescript
// hooks/use-users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserStore } from '@/lib/store/user-store'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface CreateUserData {
  email: string
  name: string
  role: string
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      return data.users
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const setError = useUserStore((state) => state.setError)

  return useMutation({
    mutationFn: async (userData: CreateUserData): Promise<User> => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create user')
      }

      const data = await response.json()
      return data.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setError(null)
    },
    onError: (error) => {
      setError(error.message)
    },
  })
}
```

## Performance

### Optimization Strategies

#### Code Splitting

```typescript
// Dynamic imports for code splitting
import dynamic from 'next/dynamic'

const DashboardChart = dynamic(
  () => import('@/components/dashboard/chart'),
  {
    loading: () => <div>Loading chart...</div>,
    ssr: false, // Disable SSR for client-only components
  }
)

// Route-based code splitting
const AdminPanel = dynamic(
  () => import('@/components/admin/panel'),
  { ssr: false }
)
```

#### Image Optimization

```typescript
import Image from 'next/image'

// Optimized images
<Image
  src="/hero-image.jpg"
  alt="Hero image"
  width={800}
  height={600}
  priority // Load above the fold images with priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// Responsive images
<Image
  src="/responsive-image.jpg"
  alt="Responsive image"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

#### Caching Strategies

```typescript
// API route caching
export async function GET(request: NextRequest) {
  const cacheKey = `users:${request.nextUrl.searchParams.toString()}`
  
  // Check Redis cache
  const cached = await redis.get(cacheKey)
  if (cached) {
    return NextResponse.json(JSON.parse(cached))
  }

  // Fetch from database
  const users = await prisma.user.findMany()
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(users))
  
  return NextResponse.json(users)
}

// React Query caching
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}
```

### Performance Monitoring

```typescript
// Performance tracking
export function trackPerformance(name: string, fn: () => Promise<any>) {
  return async (...args: any[]) => {
    const start = performance.now()
    
    try {
      const result = await fn.apply(this, args)
      const duration = performance.now() - start
      
      // Send to analytics
      if (typeof window !== 'undefined') {
        gtag('event', 'timing_complete', {
          name,
          value: Math.round(duration),
        })
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      // Track errors with timing
      if (typeof window !== 'undefined') {
        gtag('event', 'exception', {
          description: `${name} failed after ${Math.round(duration)}ms`,
          fatal: false,
        })
      }
      
      throw error
    }
  }
}
```

## Security

### Security Best Practices

#### Input Validation

```typescript
import { z } from 'zod'

// Schema validation
const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createUserSchema.parse(body)
    
    // Sanitize input
    const sanitizedData = {
      email: validatedData.email.toLowerCase().trim(),
      name: validatedData.name.trim(),
      password: validatedData.password,
    }
    
    // Process request...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Authentication & Authorization

```typescript
// Role-based access control
export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return null // Allow access
  }
}

// Usage in API routes
export async function DELETE(request: NextRequest) {
  const authCheck = await requireRole(['ADMIN'])
  if (authCheck) return authCheck
  
  // Admin-only logic here...
}
```

#### CSRF Protection

```typescript
// CSRF token validation
import { createHash } from 'crypto'

function generateCSRFToken(sessionId: string): string {
  return createHash('sha256')
    .update(sessionId + process.env.CSRF_SECRET)
    .digest('hex')
}

function validateCSRFToken(token: string, sessionId: string): boolean {
  const expectedToken = generateCSRFToken(sessionId)
  return token === expectedToken
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const csrfToken = request.headers.get('x-csrf-token')
  if (!csrfToken || !validateCSRFToken(csrfToken, session.user.id)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
  
  // Process request...
}
```

## Debugging

### Development Tools

#### Debug Configuration

```typescript
// lib/debug.ts
export const DEBUG = {
  API: process.env.NODE_ENV === 'development',
  DATABASE: process.env.DEBUG_DATABASE === 'true',
  CACHE: process.env.DEBUG_CACHE === 'true',
  AUTH: process.env.DEBUG_AUTH === 'true',
}

export function debugLog(category: keyof typeof DEBUG, message: string, data?: any) {
  if (DEBUG[category]) {
    console.log(`[${category}] ${message}`, data || '')
  }
}
```

#### Error Tracking

```typescript
// lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs'

export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
    })
  } else {
    console.error('Error:', error)
    if (context) {
      console.error('Context:', context)
    }
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, level)
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }
}
```

### Logging

```typescript
// lib/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'openaero-web' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export { logger }
```

## Contributing

### Pull Request Process

1. **Fork the repository** and create your feature branch
2. **Write tests** for your changes
3. **Ensure all tests pass** and code coverage is maintained
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact is considered
- [ ] Security implications are addressed
- [ ] Accessibility requirements are met

### Issue Reporting

When reporting issues, please include:

- **Environment details** (OS, Node.js version, browser)
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Error messages** and stack traces
- **Screenshots** if applicable

### Development Environment

Make sure your development environment includes:

- **Code editor** with TypeScript support (VS Code recommended)
- **Extensions**: ESLint, Prettier, Tailwind CSS IntelliSense
- **Git hooks** for pre-commit linting and testing
- **Database GUI** (Prisma Studio, pgAdmin, etc.)

For questions and support, reach out to the development team through:

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Slack**: #development channel for team communication
- **Email**: dev@openaero.example.com for urgent matters