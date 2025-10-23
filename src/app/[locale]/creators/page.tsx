'use client';

import { useState, useEffect } from 'react';

import { MainLayout } from '@/components/layout/MainLayout';
import { CreatorBenefits } from '@/components/sections/CreatorBenefits';
import { CreatorHero } from '@/components/sections/CreatorHero';
import { CreatorTestimonials } from '@/components/sections/CreatorTestimonials';

export default function CreatorsPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        <CreatorHero />
        <CreatorBenefits />
        <CreatorTestimonials />
      </div>
    </MainLayout>
  );
}