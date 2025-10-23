import { MainLayout } from '@/components/layout/MainLayout';
import { CaseStudiesSection } from '@/components/sections/CaseStudiesSection';
import { HeroSection } from '@/components/sections/HeroSection';
import { PartnersSection } from '@/components/sections/PartnersSection';
import { SolutionsSection } from '@/components/sections/SolutionsSection';
import { TransparencySection } from '@/components/sections/TransparencySection';
import { ValueFlowSection } from '@/components/sections/ValueFlowSection';

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
  );
}
