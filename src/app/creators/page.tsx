'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { CreatorHero } from '@/components/sections/CreatorHero';
import { CreatorBenefits } from '@/components/sections/CreatorBenefits';
import { CreatorProcess } from '@/components/sections/CreatorProcess';
import { CreatorStats } from '@/components/sections/CreatorStats';
import { CreatorTestimonials } from '@/components/sections/CreatorTestimonials';

export default function CreatorsPage() {
  return (
    <MainLayout>
      <CreatorHero />
      <CreatorBenefits />
      <CreatorProcess />
      <CreatorStats />
      <CreatorTestimonials />
    </MainLayout>
  );
}
