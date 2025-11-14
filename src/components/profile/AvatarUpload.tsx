/**
 * 头像上传组件
 * 支持图片预览、裁剪和上传
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadSuccess?: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function AvatarUpload({
  currentAvatar,
  onUploadSuccess,
  size = 'lg',
}: AvatarUploadProps) {
  const { refreshProfile } = useAuth();
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // 上传头像
  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('请先选择图片');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 压缩图片（如果需要）
      let processedFile = file;
      if (file.size > 1024 * 1024) {
        // 如果文件大于 1MB，尝试压缩
        processedFile = await compressImage(file);
      }

      // 创建 FormData
      const formData = new FormData();
      formData.append('avatar', processedFile);

      // 上传文件
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        credentials: 'include', // 确保发送 cookies
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '上传失败');
      }

      // 更新预览
      if (data.data?.avatarUrl) {
        setPreview(data.data.avatarUrl);
        await refreshProfile();
        onUploadSuccess?.(data.data.avatarUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [refreshProfile, onUploadSuccess]);

  // 删除头像
  const handleDelete = useCallback(async () => {
    if (!confirm('确定要删除头像吗？')) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/avatar', {
        method: 'DELETE',
        credentials: 'include', // 确保发送 cookies
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '删除失败');
      }

      setPreview(null);
      await refreshProfile();
      onUploadSuccess?.('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [refreshProfile, onUploadSuccess]);

  // 压缩图片
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // 计算新尺寸（最大 800x800）
          let width = img.width;
          let height = img.height;
          const maxSize = 800;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 头像预览 */}
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border-4 border-white shadow-lg`}>
        {preview ? (
          <img
            src={preview}
            alt="头像预览"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">?</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && <ErrorMessage error={error} type="error" />}

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {preview && preview !== currentAvatar ? '重新选择' : '选择图片'}
        </button>
        {preview && preview !== currentAvatar && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {uploading ? '上传中...' : '上传'}
          </button>
        )}
        {preview && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={uploading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            删除
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        支持 JPG、PNG、WebP 格式，最大 5MB
      </p>
    </div>
  );
}

