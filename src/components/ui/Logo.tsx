import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { width: 48, height: 48, textSize: 'text-lg' },
  md: { width: 56, height: 56, textSize: 'text-xl' },
  lg: { width: 64, height: 64, textSize: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const { width, height, textSize } = sizeMap[size];

  return (
    <Link href="/" className={`flex items-end space-x-3 ${className}`}>
      <div className="relative flex-shrink-0">
        <Image
          src="/images/openaero-logo-trimmed.png"
          alt="OpenAero Logo"
          width={width}
          height={height}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={`font-bold text-secondary-900 ${textSize} whitespace-nowrap font-sans`} style={{ fontFamily: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif' }}>
          开元空御
        </span>
      )}
    </Link>
  );
}

// 仅图标的版本
export function LogoIcon({ size = 'md', className = '' }: Omit<LogoProps, 'showText'>) {
  return <Logo size={size} showText={false} className={className} />;
}

// 仅文字的版本
export function LogoText({ size = 'md', className = '' }: Omit<LogoProps, 'showText'>) {
  const { textSize } = sizeMap[size];
  
  return (
    <Link href="/" className={`font-bold text-secondary-900 ${textSize} font-sans ${className}`} style={{ fontFamily: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif' }}>
      开元空御
    </Link>
  );
}
