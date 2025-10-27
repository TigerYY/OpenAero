// SEO 优化库
import { Metadata } from 'next';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  author?: string;
  canonical?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  locale?: string;
  alternateLocales?: string[];
  robots?: string;
  viewport?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

// SEO 元数据生成器
export class SEOManager {
  private baseConfig: Partial<SEOConfig>;
  private structuredDataList: StructuredData[] = [];

  constructor(baseConfig: Partial<SEOConfig> = {}) {
    this.baseConfig = {
      author: 'OpenAero',
      locale: 'zh-CN',
      robots: 'index,follow',
      viewport: 'width=device-width,initial-scale=1',
      twitterCard: 'summary_large_image',
      ...baseConfig
    };
  }

  // 生成页面元数据
  generateMetadata(config: SEOConfig): Metadata {
    const fullConfig = { ...this.baseConfig, ...config };

    const metadata: Metadata = {
      title: fullConfig.title,
      description: fullConfig.description,
      keywords: fullConfig.keywords?.join(', '),
      authors: fullConfig.author ? [{ name: fullConfig.author }] : undefined,
      robots: fullConfig.robots,
      viewport: fullConfig.viewport,
      
      // Open Graph
      openGraph: {
        title: fullConfig.title,
        description: fullConfig.description,
        url: fullConfig.canonical,
        siteName: 'OpenAero',
        locale: fullConfig.locale,
        type: 'website',
        images: fullConfig.ogImage ? [
          {
            url: fullConfig.ogImage,
            width: 1200,
            height: 630,
            alt: fullConfig.title
          }
        ] : undefined
      },

      // Twitter Card
      twitter: {
        card: fullConfig.twitterCard,
        title: fullConfig.title,
        description: fullConfig.description,
        images: fullConfig.ogImage ? [fullConfig.ogImage] : undefined
      },

      // 规范链接
      alternates: {
        canonical: fullConfig.canonical,
        languages: fullConfig.alternateLocales ? 
          Object.fromEntries(
            fullConfig.alternateLocales.map(locale => [
              locale, 
              fullConfig.canonical?.replace(/\/[a-z]{2}-[A-Z]{2}\//, `/${locale}/`) || ''
            ])
          ) : undefined
      }
    };

    return metadata;
  }

  // 添加结构化数据
  addStructuredData(data: StructuredData): void {
    this.structuredDataList.push(data);
  }

  // 生成结构化数据脚本
  generateStructuredDataScript(): string {
    if (this.structuredDataList.length === 0) return '';

    const jsonLd = this.structuredDataList.length === 1 
      ? this.structuredDataList[0]
      : this.structuredDataList;

    return `<script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 2)}
    </script>`;
  }

  // 清空结构化数据
  clearStructuredData(): void {
    this.structuredDataList = [];
  }
}

// 结构化数据生成器
export const StructuredDataGenerator = {
  // 网站信息
  website(config: {
    name: string;
    url: string;
    description: string;
    logo?: string;
    sameAs?: string[];
  }): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.name,
      url: config.url,
      description: config.description,
      logo: config.logo,
      sameAs: config.sameAs
    };
  },

  // 组织信息
  organization(config: {
    name: string;
    url: string;
    logo: string;
    description?: string;
    contactPoint?: {
      telephone: string;
      contactType: string;
      email?: string;
    };
    address?: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
    sameAs?: string[];
  }): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: config.name,
      url: config.url,
      logo: config.logo,
      description: config.description,
      contactPoint: config.contactPoint,
      address: config.address,
      sameAs: config.sameAs
    };
  },

  // 面包屑导航
  breadcrumb(items: BreadcrumbItem[]): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  },

  // 文章
  article(config: {
    headline: string;
    description: string;
    image: string;
    datePublished: string;
    dateModified?: string;
    author: {
      name: string;
      url?: string;
    };
    publisher: {
      name: string;
      logo: string;
    };
    url: string;
  }): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: config.headline,
      description: config.description,
      image: config.image,
      datePublished: config.datePublished,
      dateModified: config.dateModified || config.datePublished,
      author: {
        '@type': 'Person',
        name: config.author.name,
        url: config.author.url
      },
      publisher: {
        '@type': 'Organization',
        name: config.publisher.name,
        logo: {
          '@type': 'ImageObject',
          url: config.publisher.logo
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': config.url
      }
    };
  },

  // 产品
  product(config: {
    name: string;
    description: string;
    image: string;
    brand: string;
    offers: {
      price: string;
      priceCurrency: string;
      availability: string;
      url: string;
    };
    aggregateRating?: {
      ratingValue: number;
      reviewCount: number;
    };
  }): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: config.name,
      description: config.description,
      image: config.image,
      brand: {
        '@type': 'Brand',
        name: config.brand
      },
      offers: {
        '@type': 'Offer',
        price: config.offers.price,
        priceCurrency: config.offers.priceCurrency,
        availability: config.offers.availability,
        url: config.offers.url
      },
      aggregateRating: config.aggregateRating ? {
        '@type': 'AggregateRating',
        ratingValue: config.aggregateRating.ratingValue,
        reviewCount: config.aggregateRating.reviewCount
      } : undefined
    };
  },

  // FAQ
  faq(items: Array<{ question: string; answer: string }>): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    };
  }
};

// SEO 工具函数
export const SEOUtils = {
  // 生成页面标题
  generateTitle(title: string, siteName: string = 'OpenAero'): string {
    return title === siteName ? title : `${title} | ${siteName}`;
  },

  // 生成描述
  truncateDescription(description: string, maxLength: number = 160): string {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength - 3) + '...';
  },

  // 生成关键词
  generateKeywords(content: string, maxKeywords: number = 10): string[] {
    // 简单的关键词提取（实际项目中可能需要更复杂的算法）
    const words = content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  },

  // 生成规范链接
  generateCanonicalUrl(path: string, baseUrl: string = 'https://openaero.com'): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  },

  // 验证元数据
  validateMetadata(metadata: SEOConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.title) {
      errors.push('标题不能为空');
    } else if (metadata.title.length > 60) {
      errors.push('标题长度不应超过60个字符');
    }

    if (!metadata.description) {
      errors.push('描述不能为空');
    } else if (metadata.description.length > 160) {
      errors.push('描述长度不应超过160个字符');
    }

    if (metadata.keywords && metadata.keywords.length > 10) {
      errors.push('关键词数量不应超过10个');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // 生成 robots.txt
  generateRobotsTxt(config: {
    userAgent?: string;
    allow?: string[];
    disallow?: string[];
    sitemap?: string;
    crawlDelay?: number;
  } = {}): string {
    const {
      userAgent = '*',
      allow = [],
      disallow = [],
      sitemap,
      crawlDelay
    } = config;

    let robotsTxt = `User-agent: ${userAgent}\n`;

    allow.forEach(path => {
      robotsTxt += `Allow: ${path}\n`;
    });

    disallow.forEach(path => {
      robotsTxt += `Disallow: ${path}\n`;
    });

    if (crawlDelay) {
      robotsTxt += `Crawl-delay: ${crawlDelay}\n`;
    }

    if (sitemap) {
      robotsTxt += `\nSitemap: ${sitemap}`;
    }

    return robotsTxt;
  },

  // 生成站点地图项
  generateSitemapUrl(config: {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
  }): string {
    let url = `  <url>\n    <loc>${config.loc}</loc>\n`;

    if (config.lastmod) {
      url += `    <lastmod>${config.lastmod}</lastmod>\n`;
    }

    if (config.changefreq) {
      url += `    <changefreq>${config.changefreq}</changefreq>\n`;
    }

    if (config.priority !== undefined) {
      url += `    <priority>${config.priority}</priority>\n`;
    }

    url += '  </url>';
    return url;
  }
};

// 默认 SEO 管理器
export const seoManager = new SEOManager({
  author: 'OpenAero Team',
  locale: 'zh-CN',
  robots: 'index,follow',
  viewport: 'width=device-width,initial-scale=1',
  twitterCard: 'summary_large_image'
});

// 页面性能监控
export const PerformanceTracker = {
  // 核心 Web 指标
  measureCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      console.log('CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  },

  // 页面加载性能
  measurePageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      console.log('页面性能指标:', {
        DNS查询: navigation.domainLookupEnd - navigation.domainLookupStart,
        TCP连接: navigation.connectEnd - navigation.connectStart,
        请求响应: navigation.responseEnd - navigation.requestStart,
        DOM解析: navigation.domContentLoadedEventEnd - navigation.responseEnd,
        资源加载: navigation.loadEventStart - navigation.domContentLoadedEventEnd,
        总加载时间: navigation.loadEventEnd - navigation.fetchStart
      });
    });
  }
};