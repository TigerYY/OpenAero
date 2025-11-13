'use client';

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
    <div className="min-h-screen bg-white">
      <CreatorHero />
      <CreatorBenefits />
      <CreatorTestimonials />
    </div>
  );
}