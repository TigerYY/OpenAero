import { CaseStudiesSection } from '@/components/sections/CaseStudiesSection';
import { HeroSection } from '@/components/sections/HeroSection';
import { PartnersSection } from '@/components/sections/PartnersSection';
import { SolutionsSection } from '@/components/sections/SolutionsSection';
import { TransparencySection } from '@/components/sections/TransparencySection';
import { ValueFlowSection } from '@/components/sections/ValueFlowSection';

interface HomePageProps {
  params: {
    locale: string;
  };
}

export default async function HomePage({ params }: HomePageProps) {
  return (
    <>
      <HeroSection />
      <ValueFlowSection />
      <SolutionsSection />
      <TransparencySection />
      <PartnersSection />
      <CaseStudiesSection />
    </>
  );
}
