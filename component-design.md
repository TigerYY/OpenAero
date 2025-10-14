# GLAD-N 网站组件设计方案

## 1. 组件架构设计

### 1.1 组件分层
```
页面组件 (Pages)
├── 布局组件 (Layouts)
├── 区块组件 (Sections)
├── 业务组件 (Business)
├── 基础UI组件 (UI)
└── 工具组件 (Utils)
```

### 1.2 组件命名规范
- **页面组件**：`Page` 后缀，如 `HomePage`, `SolutionDetailPage`
- **布局组件**：`Layout` 后缀，如 `MainLayout`, `AuthLayout`
- **区块组件**：`Section` 后缀，如 `HeroSection`, `FeaturesSection`
- **业务组件**：业务相关命名，如 `ProductCard`, `BOMList`
- **UI组件**：通用命名，如 `Button`, `Modal`, `Table`

## 2. 核心页面组件

### 2.1 首页 (HomePage)
```typescript
// src/app/(pages)/page.tsx
export default function HomePage() {
  return (
    <MainLayout>
      <HeroSection />
      <ValueFlowSection />
      <SolutionsSection />
      <TransparencySection />
      <PartnersSection />
      <CaseStudiesSection />
    </MainLayout>
  )
}
```

### 2.2 解决方案详情页 (SolutionDetailPage)
```typescript
// src/app/(pages)/solutions/[slug]/page.tsx
export default function SolutionDetailPage({ params }: { params: { slug: string } }) {
  return (
    <MainLayout>
      <ProductHeader />
      <ProductFeatures />
      <TechnicalSpecs />
      <PerformanceReport />
      <BOMList />
      <PricingModule />
      <PurchaseCTA />
    </MainLayout>
  )
}
```

### 2.3 核心技术页 (TechnologyPage)
```typescript
// src/app/(pages)/technology/page.tsx
export default function TechnologyPage() {
  return (
    <MainLayout>
      <TechnologyHero />
      <OptimizationPhilosophy />
      <TechWorkflow />
      <TeamSection />
    </MainLayout>
  )
}
```

## 3. 布局组件

### 3.1 主布局 (MainLayout)
```typescript
// src/components/layout/MainLayout.tsx
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

### 3.2 页眉 (Header)
```typescript
// src/components/layout/Header.tsx
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />
          <Navigation />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
```

### 3.3 页脚 (Footer)
```typescript
// src/components/layout/Footer.tsx
export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <CompanyInfo />
          <SiteMap />
          <ContactInfo />
          <SocialLinks />
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <Copyright />
        </div>
      </div>
    </footer>
  )
}
```

## 4. 首页区块组件

### 4.1 Hero区块 (HeroSection)
```typescript
// src/components/sections/HeroSection.tsx
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
              <Button size="lg" variant="primary">
                探索解决方案
              </Button>
              <Button size="lg" variant="outline">
                了解核心技术
              </Button>
            </div>
          </div>
          <div className="relative">
            <ProductShowcase />
          </div>
        </div>
      </div>
    </section>
  )
}
```

### 4.2 价值流程区块 (ValueFlowSection)
```typescript
// src/components/sections/ValueFlowSection.tsx
export function ValueFlowSection() {
  const steps = [
    {
      title: "传统DIY痛点",
      description: "供应链复杂、性能无保障、研发周期长",
      icon: "❌"
    },
    {
      title: "GLAD-N解决方案",
      description: "高性能核心套件、透明BOM、技术支持",
      icon: "✅"
    },
    {
      title: "客户成功",
      description: "快速集成、专注业务、降低风险",
      icon: "🚀"
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          从痛点到成功的价值流程
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mb-4">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600 max-w-xs">{step.description}</p>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 transform translate-x-1/2">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

### 4.3 解决方案精选区块 (SolutionsSection)
```typescript
// src/components/sections/SolutionsSection.tsx
export function SolutionsSection() {
  const solutions = [
    {
      id: 's1',
      name: 'GLAD-N S1',
      type: '测绘型',
      description: '专为测绘应用优化的高性能无人机核心套件',
      features: ['高精度定位', '长续航能力', '专业相机支持'],
      image: '/images/s1-preview.jpg',
      href: '/solutions/glad-n-s1'
    },
    {
      id: 'p1',
      name: 'GLAD-N P1',
      type: '安防型',
      description: '专为安防监控设计的可靠无人机核心套件',
      features: ['夜视能力', '稳定悬停', '实时传输'],
      image: '/images/p1-preview.jpg',
      href: '/solutions/glad-n-p1'
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          核心解决方案
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {solutions.map((solution) => (
            <ProductCard key={solution.id} {...solution} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

## 5. 业务组件

### 5.1 产品卡片 (ProductCard)
```typescript
// src/components/business/ProductCard.tsx
interface ProductCardProps {
  name: string
  type: string
  description: string
  features: string[]
  image: string
  href: string
}

export function ProductCard({ name, type, description, features, image, href }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="aspect-video bg-gray-200">
        <Image src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">{name}</h3>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
            {type}
          </span>
        </div>
        <p className="text-gray-600 mb-4">{description}</p>
        <ul className="space-y-1 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
              {feature}
            </li>
          ))}
        </ul>
        <Button asChild className="w-full">
          <Link href={href}>了解详情</Link>
        </Button>
      </div>
    </div>
  )
}
```

### 5.2 BOM清单组件 (BOMList)
```typescript
// src/components/business/BOMList.tsx
interface BOMItem {
  id: string
  name: string
  brand: string
  model: string
  image: string
  price: number
  link: string
}

interface BOMListProps {
  items: BOMItem[]
}

export function BOMList({ items }: BOMListProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">公开BOM清单</h3>
          <Button
            variant="outline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '收起' : '展开'} 清单
          </Button>
        </div>
        <p className="text-gray-600 mt-2">
          我们承诺完全透明的配件清单，每个配件都可独立采购
        </p>
      </div>
      
      {expanded && (
        <div className="p-6">
          <div className="space-y-4">
            {items.map((item) => (
              <BOMItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BOMItem({ item }: { item: BOMItem }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        <Image
          src={item.image}
          alt={item.name}
          width={48}
          height={48}
          className="rounded"
        />
        <div>
          <h4 className="font-medium">{item.name}</h4>
          <p className="text-sm text-gray-600">{item.brand} {item.model}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="font-semibold">¥{item.price}</span>
        <Button asChild size="sm" variant="outline">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            查看详情
          </a>
        </Button>
      </div>
    </div>
  )
}
```

### 5.3 透明定价模块 (PricingModule)
```typescript
// src/components/business/PricingModule.tsx
interface PricingModuleProps {
  marketPrice: number
  serviceFee: number
  finalPrice: number
}

export function PricingModule({ marketPrice, serviceFee, finalPrice }: PricingModuleProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">透明定价</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span>市场配件总价参考</span>
          <span className="font-medium">¥{marketPrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>GLAD-N技术服务费</span>
          <span className="font-medium">¥{serviceFee.toLocaleString()}</span>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>最终售价</span>
            <span className="text-blue-600">¥{finalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>技术服务费包含：硬件调优、固件适配、技术支持、质量保证</p>
      </div>
    </div>
  )
}
```

## 6. 基础UI组件

### 6.1 按钮组件 (Button)
```typescript
// src/components/ui/Button.tsx
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
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50",
    ghost: "hover:bg-gray-100"
  }
  
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg"
  }

  const Component = asChild ? Slot : "button"
  
  return (
    <Component
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
```

### 6.2 模态框组件 (Modal)
```typescript
// src/components/ui/Modal.tsx
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
```

## 7. 工具组件

### 7.1 表单组件 (ContactForm)
```typescript
// src/components/forms/ContactForm.tsx
export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 处理表单提交
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="姓名"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
        <Input
          label="邮箱"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="公司"
          value={formData.company}
          onChange={(e) => setFormData({...formData, company: e.target.value})}
        />
        <Input
          label="电话"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
      </div>
      <Textarea
        label="留言"
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
        rows={4}
      />
      <Button type="submit" className="w-full">
        提交咨询
      </Button>
    </form>
  )
}
```

## 8. 组件使用示例

### 8.1 页面组合示例
```typescript
// src/app/(pages)/solutions/glad-n-s1/page.tsx
export default function GLADNS1Page() {
  const productData = {
    name: "GLAD-N S1",
    type: "测绘型",
    description: "专为测绘应用优化的高性能无人机核心套件",
    features: [
      "RTK高精度定位",
      "30分钟续航",
      "专业测绘相机支持",
      "厘米级精度"
    ],
    specifications: {
      "飞行时间": "30分钟",
      "定位精度": "±2cm",
      "最大载重": "2kg",
      "工作温度": "-10°C ~ 40°C"
    },
    bomItems: [
      // BOM数据
    ],
    pricing: {
      marketPrice: 15000,
      serviceFee: 3000,
      finalPrice: 18000
    }
  }

  return (
    <MainLayout>
      <ProductHeader {...productData} />
      <ProductFeatures features={productData.features} />
      <TechnicalSpecs specifications={productData.specifications} />
      <PerformanceReport />
      <BOMList items={productData.bomItems} />
      <PricingModule {...productData.pricing} />
      <PurchaseCTA productId="glad-n-s1" />
    </MainLayout>
  )
}
```

这个组件设计方案提供了完整的组件架构，从基础UI组件到复杂的业务组件，都遵循了良好的设计原则和代码规范。每个组件都有清晰的职责划分，便于维护和扩展。
