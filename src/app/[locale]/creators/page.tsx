'use client';

// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { CreatorBenefits } from '@/components/sections/CreatorBenefits';
import { CreatorHero } from '@/components/sections/CreatorHero';
import { CreatorTestimonials } from '@/components/sections/CreatorTestimonials';

interface CreatorsPageProps {
  params: {
    locale: string;
  };
}

export default function CreatorsPage({ params: { locale } }: CreatorsPageProps) {
  return (
    <DefaultLayout>
      <div className="bg-white">
        <CreatorHero />
        <CreatorBenefits />
        <CreatorTestimonials />
      </div>
    </DefaultLayout>
  );
}