import { HeroSection } from '@/components/sections/HeroSection';
import { ValueFlowSection } from '@/components/sections/ValueFlowSection';
import { SolutionsSection } from '@/components/sections/SolutionsSection';
import { TransparencySection } from '@/components/sections/TransparencySection';
import { PartnersSection } from '@/components/sections/PartnersSection';
import { CaseStudiesSection } from '@/components/sections/CaseStudiesSection';
import { MainLayout } from '@/components/layout/MainLayout';

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
