
interface DragonflyIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function DragonflyIcon({ className = '', size = 'md' }: DragonflyIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 蜻蜓身体 */}
      <path
        d="M12 2L14 8L12 14L10 8L12 2Z"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* 蜻蜓头部 */}
      <circle
        cx="12"
        cy="4"
        r="1.5"
        fill="currentColor"
      />
      
      {/* 眼睛 */}
      <circle
        cx="11"
        cy="3.5"
        r="0.5"
        fill="#ff6b35"
      />
      <circle
        cx="13"
        cy="3.5"
        r="0.5"
        fill="#ff6b35"
      />
      
      {/* 翅膀 - 左上 */}
      <path
        d="M8 6L6 4L8 2L10 4L8 6Z"
        fill="currentColor"
        opacity="0.6"
      />
      
      {/* 翅膀 - 右上 */}
      <path
        d="M16 6L18 4L16 2L14 4L16 6Z"
        fill="currentColor"
        opacity="0.6"
      />
      
      {/* 翅膀 - 左下 */}
      <path
        d="M8 10L6 12L8 14L10 12L8 10Z"
        fill="currentColor"
        opacity="0.6"
      />
      
      {/* 翅膀 - 右下 */}
      <path
        d="M16 10L18 12L16 14L14 12L16 10Z"
        fill="currentColor"
        opacity="0.6"
      />
      
      {/* 尾部发光点 */}
      <circle
        cx="12"
        cy="16"
        r="1"
        fill="#ff6b35"
        opacity="0.8"
      />
    </svg>
  );
}
