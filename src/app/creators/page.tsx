'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { CreatorBenefits } from '@/components/sections/CreatorBenefits';
import { CreatorHero } from '@/components/sections/CreatorHero';
import { CreatorTestimonials } from '@/components/sections/CreatorTestimonials';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default function CreatorsPage() {
  return (
    <MainLayout locale="zh-CN">
      <div className="min-h-screen bg-white">
        <CreatorHero />
        <CreatorBenefits />
        <CreatorTestimonials />
      </div>
    </MainLayout>
  );
}