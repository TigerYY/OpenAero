import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { 
  SEOManager,
  StructuredDataGenerator,
  SEOUtils,
  PerformanceTracker,
  SEOConfig,
  StructuredData,
  BreadcrumbItem
} from '../seo'

// Mock performance API
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn()
}

const mockPerformanceEntry = {
  name: 'test-entry',
  entryType: 'navigation',
  startTime: 0,
  duration: 1000,
  loadEventEnd: 2000,
  domContentLoadedEventEnd: 1500
}

// Mock global objects
Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: jest.fn().mockImplementation((...args: any[]) => {
    const callback = args[0] as (list: any) => void
    // Simulate performance entries
    setTimeout(() => {
      callback({
        getEntries: () => [mockPerformanceEntry]
      })
    }, 100)
    return mockPerformanceObserver
  })
})

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => [mockPerformanceEntry]),
    mark: jest.fn(),
    measure: jest.fn()
  }
})

describe('SEO Module', () => {
  let seoManager: SEOManager

  beforeEach(() => {
    seoManager = new SEOManager({
      author: 'Test Author',
      locale: 'zh-CN'
    })
  })

  describe('SEOManager', () => {
    it('should generate basic metadata', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        description: 'Test description'
      }

      const metadata = seoManager.generateMetadata(config)

      expect(metadata.title).toBe('Test Page')
      expect(metadata.description).toBe('Test description')
      expect(metadata.openGraph?.title).toBe('Test Page')
      expect(metadata.openGraph?.description).toBe('Test description')
    })

    it('should generate metadata with keywords', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        description: 'Test description',
        keywords: ['test', 'page', 'seo']
      }

      const metadata = seoManager.generateMetadata(config)

      expect(metadata.keywords).toEqual(['test', 'page', 'seo'])
    })

    it('should generate metadata with canonical URL', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        description: 'Test description',
        canonical: 'https://example.com/test'
      }

      const metadata = seoManager.generateMetadata(config)

      expect(metadata.alternates?.canonical).toBe('https://example.com/test')
    })

    it('should add and generate structured data', () => {
      const structuredData: StructuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Test Page'
      }

      seoManager.addStructuredData(structuredData)
      const script = seoManager.generateStructuredDataScript()

      expect(script).toContain('"@type":"WebPage"')
      expect(script).toContain('"name":"Test Page"')
    })

    it('should clear structured data', () => {
      const structuredData: StructuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Test Page'
      }

      seoManager.addStructuredData(structuredData)
      seoManager.clearStructuredData()
      const script = seoManager.generateStructuredDataScript()

      expect(script).toBe('')
    })
  })

  describe('StructuredDataGenerator', () => {
    it('should generate website structured data', () => {
      const config = {
        name: 'Test Website',
        url: 'https://example.com',
        description: 'Test description'
      }

      const structuredData = StructuredDataGenerator.website(config)

      expect(structuredData['@context']).toBe('https://schema.org')
      expect(structuredData['@type']).toBe('WebSite')
      expect(structuredData.name).toBe('Test Website')
      expect(structuredData.url).toBe('https://example.com')
    })

    it('should generate organization structured data', () => {
      const config = {
        name: 'Test Organization',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        description: 'Test organization'
      }

      const structuredData = StructuredDataGenerator.organization(config)

      expect(structuredData['@type']).toBe('Organization')
      expect(structuredData.name).toBe('Test Organization')
      expect(structuredData.logo).toBe('https://example.com/logo.png')
    })

    it('should generate breadcrumb structured data', () => {
      const items: BreadcrumbItem[] = [
        { name: 'Home', url: 'https://example.com' },
        { name: 'Category', url: 'https://example.com/category' },
        { name: 'Page', url: 'https://example.com/category/page' }
      ]

      const structuredData = StructuredDataGenerator.breadcrumb(items)

      expect(structuredData['@type']).toBe('BreadcrumbList')
      expect(structuredData.itemListElement).toHaveLength(3)
      expect(structuredData.itemListElement[0].name).toBe('Home')
    })

    it('should generate article structured data', () => {
      const config = {
        headline: 'Test Article',
        description: 'Test description',
        image: 'https://example.com/image.jpg',
        datePublished: '2024-01-01',
        author: { name: 'John Doe' },
        publisher: { name: 'Test Publisher', logo: 'https://example.com/logo.png' },
        url: 'https://example.com/article'
      }

      const structuredData = StructuredDataGenerator.article(config)

      expect(structuredData['@type']).toBe('Article')
      expect(structuredData.headline).toBe('Test Article')
      expect(structuredData.author.name).toBe('John Doe')
    })

    it('should generate product structured data', () => {
      const config = {
        name: 'Test Product',
        description: 'Test description',
        image: 'https://example.com/product.jpg',
        brand: 'Test Brand',
        offers: {
          price: '99.99',
          priceCurrency: 'USD',
          availability: 'InStock',
          url: 'https://example.com/product'
        }
      }

      const structuredData = StructuredDataGenerator.product(config)

      expect(structuredData['@type']).toBe('Product')
      expect(structuredData.name).toBe('Test Product')
      expect(structuredData.offers.price).toBe('99.99')
    })

    it('should generate FAQ structured data', () => {
      const items = [
        { question: 'What is this?', answer: 'This is a test.' },
        { question: 'How does it work?', answer: 'It works well.' }
      ]

      const structuredData = StructuredDataGenerator.faq(items)

      expect(structuredData['@type']).toBe('FAQPage')
      expect(structuredData.mainEntity).toHaveLength(2)
      expect(structuredData.mainEntity[0].name).toBe('What is this?')
    })
  })

  describe('SEOUtils', () => {
    it('should generate proper title', () => {
      const title = SEOUtils.generateTitle('Test Page', 'Test Site')
      expect(title).toBe('Test Page | Test Site')
    })

    it('should truncate description', () => {
      const longDescription = 'A'.repeat(200)
      const truncated = SEOUtils.truncateDescription(longDescription, 100)
      
      expect(truncated.length).toBeLessThanOrEqual(103) // 100 + '...'
      expect(truncated.endsWith('...')).toBe(true)
    })

    it('should generate keywords from content', () => {
      const content = 'This is a test content about SEO optimization and web development'
      const keywords = SEOUtils.generateKeywords(content, 5)
      
      expect(Array.isArray(keywords)).toBe(true)
      expect(keywords.length).toBeLessThanOrEqual(5)
    })

    it('should generate canonical URL', () => {
      const canonical = SEOUtils.generateCanonicalUrl('/test-page', 'https://example.com')
      expect(canonical).toBe('https://example.com/test-page')
    })

    it('should validate metadata', () => {
      const validMetadata: SEOConfig = {
        title: 'Test Page',
        description: 'Test description'
      }

      const result = SEOUtils.validateMetadata(validMetadata)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid metadata', () => {
      const invalidMetadata: SEOConfig = {
        title: '',
        description: 'A'.repeat(200)
      }

      const result = SEOUtils.validateMetadata(invalidMetadata)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should generate robots.txt', () => {
      const robotsTxt = SEOUtils.generateRobotsTxt({
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin', '/private'],
        sitemap: 'https://example.com/sitemap.xml'
      })

      expect(robotsTxt).toContain('User-agent: *')
      expect(robotsTxt).toContain('Allow: /')
      expect(robotsTxt).toContain('Disallow: /admin')
      expect(robotsTxt).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('should generate sitemap URL', () => {
      const sitemapUrl = SEOUtils.generateSitemapUrl({
        loc: 'https://example.com/page',
        lastmod: '2024-01-01',
        changefreq: 'weekly',
        priority: 0.8
      })

      expect(sitemapUrl).toContain('<loc>https://example.com/page</loc>')
      expect(sitemapUrl).toContain('<lastmod>2024-01-01</lastmod>')
      expect(sitemapUrl).toContain('<changefreq>weekly</changefreq>')
      expect(sitemapUrl).toContain('<priority>0.8</priority>')
    })
  })

  describe('PerformanceTracker', () => {
    it('should initialize performance observer', () => {
      PerformanceTracker.measureCoreWebVitals()
      
      expect(global.PerformanceObserver).toHaveBeenCalled()
      expect(mockPerformanceObserver.observe).toHaveBeenCalled()
    })

    it('should measure page load', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      PerformanceTracker.measurePageLoad()
      
      expect(global.performance.getEntriesByType).toHaveBeenCalledWith('navigation')
      
      consoleSpy.mockRestore()
    })

    it('should handle missing performance API gracefully', () => {
      const originalPerformance = global.performance
      delete (global as any).performance

      expect(() => {
        PerformanceTracker.measurePageLoad()
      }).not.toThrow()

      global.performance = originalPerformance
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty SEO config', () => {
      const config: SEOConfig = {
        title: '',
        description: ''
      }

      const metadata = seoManager.generateMetadata(config)
      expect(metadata).toBeDefined()
      expect(metadata.title).toBe('')
    })

    it('should handle malformed structured data', () => {
      const malformedData = {
        '@context': 'invalid-context',
        '@type': 'InvalidType'
      } as StructuredData

      expect(() => {
        seoManager.addStructuredData(malformedData)
      }).not.toThrow()
    })

    it('should handle empty breadcrumb items', () => {
      const emptyItems: BreadcrumbItem[] = []
      const structuredData = StructuredDataGenerator.breadcrumb(emptyItems)

      expect(structuredData.itemListElement).toHaveLength(0)
    })

    it('should handle invalid content for keyword generation', () => {
       const keywords = SEOUtils.generateKeywords('', 5)
       expect(Array.isArray(keywords)).toBe(true)
       expect(keywords.length).toBe(0)
     })
  })
})