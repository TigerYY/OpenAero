'use client';

import {
    getLanguageDisplayName,
    getLanguageFlag,
    getLanguageNativeName
} from '@/lib/i18n-utils';
import { LanguageSwitcherProps, Locale } from '@/types/i18n';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

export function LanguageSwitcher({
  currentLocale,
  onLocaleChange,
  size = 'md',
  showFlags = true,
  showNativeNames = true,
  showEnglishNames = false,
  className = '',
}: LanguageSwitcherProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const supportedLocales: Locale[] = ['zh-CN', 'en-US'];

  // 处理语言切换
  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    
    console.log('LanguageSwitcher: Changing language from', currentLocale, 'to', newLocale);
    onLocaleChange(newLocale);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  // 处理键盘导航
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < supportedLocales.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : supportedLocales.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < supportedLocales.length) {
          const selectedLocale = supportedLocales[focusedIndex];
          if (selectedLocale) {
            handleLanguageChange(selectedLocale);
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 尺寸样式
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  // 渲染语言选项
  const renderLanguageOption = (locale: Locale, index: number) => {
    const isSelected = locale === currentLocale;
    const isFocused = index === focusedIndex;

    return (
      <button
        key={locale}
        onClick={() => handleLanguageChange(locale)}
        className={`
          w-full text-left px-3 py-2 text-sm flex items-center space-x-2
          hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
          ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
          ${isFocused ? 'bg-gray-100' : ''}
        `}
        aria-selected={isSelected}
        role="option"
      >
        {showFlags && (
          <span className="text-lg" role="img" aria-label={`${getLanguageNativeName(locale)} flag`}>
            {getLanguageFlag(locale as Locale)}
          </span>
        )}
        <div className="flex-1">
          {showNativeNames && (
            <div className="font-medium">{getLanguageNativeName(locale)}</div>
          )}
          {showEnglishNames && (
            <div className="text-xs text-gray-500">{getLanguageDisplayName(locale)}</div>
          )}
        </div>
        {isSelected && (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    );
  };

  // 渲染下拉菜单变体（默认）
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          ${sizeClasses[size]} bg-white border border-gray-300 rounded-md shadow-sm
          flex items-center justify-between space-x-2
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isOpen ? 'ring-2 ring-blue-500' : ''}
          w-full sm:w-auto
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('common.selectLanguage')}
      >
        <div className="flex items-center space-x-2 min-w-0">
        {showFlags && (
          <span className="text-lg flex-shrink-0" role="img" aria-label={`${getLanguageNativeName(currentLocale as Locale)} flag`}>
            {getLanguageFlag(currentLocale as Locale)}
          </span>
        )}
          <span className="truncate">
            {showNativeNames 
              ? getLanguageNativeName(currentLocale as Locale)
              : getLanguageDisplayName(currentLocale as Locale)
            }
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 sm:right-0 sm:left-auto left-0 mt-1 w-full sm:w-auto min-w-full bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
          role="listbox"
          aria-label={t('common.selectLanguage')}
        >
          {supportedLocales.map((locale, index) => 
            renderLanguageOption(locale, index)
          )}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;