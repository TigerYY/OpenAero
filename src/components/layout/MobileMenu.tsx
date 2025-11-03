'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: Array<{ name: string; href: string }>;
}

export function MobileMenu({ isOpen, onClose, navigation }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mobile-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            key="mobile-menu-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">O</span>
                  </div>
                  <span className="text-xl font-bold text-secondary-900">
                    OpenAero
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-secondary-600 hover:text-primary-600"
                >
                  <span className="sr-only">关闭菜单</span>
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-6 py-6">
                <ul className="space-y-4">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="block px-4 py-3 text-lg text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        onClick={onClose}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* CTA */}
              <div className="p-6 border-t border-secondary-200 space-y-4">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/contact" onClick={onClose}>
                    联系我们
                  </Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/creators/apply" onClick={onClose}>
                    成为创作者
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
