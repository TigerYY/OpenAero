'use client';

import { CreatorBenefits } from '@/components/sections/CreatorBenefits';
import { CreatorHero } from '@/components/sections/CreatorHero';
import { CreatorTestimonials } from '@/components/sections/CreatorTestimonials';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

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