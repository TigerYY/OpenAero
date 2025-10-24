'use client';

import { useState } from 'react';
import { MobileMenu } from './MobileMenu';

interface ClientMobileMenuProps {
  navigation: Array<{ name: string; href: string }>;
}

export function ClientMobileMenu({ navigation }: ClientMobileMenuProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="text-secondary-600 hover:text-primary-600 p-2"
        aria-label="打开菜单"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={navigation}
      />
    </>
  );
}
