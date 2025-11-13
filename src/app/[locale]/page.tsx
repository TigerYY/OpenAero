import { CaseStudiesSection } from '@/components/sections/CaseStudiesSection';
import { HeroSection } from '@/components/sections/HeroSection';
import { PartnersSection } from '@/components/sections/PartnersSection';
import { SolutionsSection } from '@/components/sections/SolutionsSection';
import { TransparencySection } from '@/components/sections/TransparencySection';
import { ValueFlowSection } from '@/components/sections/ValueFlowSection';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

interface HomePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  
  return (
    <DefaultLayout>
      <HeroSection />
      <ValueFlowSection />
      <SolutionsSection />
      <TransparencySection />
      <PartnersSection />
      <CaseStudiesSection />
    </DefaultLayout>
  );
}
