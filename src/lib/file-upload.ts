/**
 * 文件上传工具库
 * 支持图片、文档、CAD文件等多种格式的上传和管理
 */

export interface UploadOptions {
  maxSize?: number; // 最大文件大小（字节）
  allowedTypes?: string[]; // 允许的文件类型
  quality?: number; // 图片压缩质量 (0-1)
  maxWidth?: number; // 图片最大宽度
  maxHeight?: number; // 图片最大高度
}

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// 默认配置
const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: [
    // 图片
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // 文档
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // CAD文件
    'application/dwg',
    'application/dxf',
    'model/step',
    'model/iges',
    // 压缩文件
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // 视频
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
  ],
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
};

/**
 * 验证文件是否符合要求
 */
export function validateFile(file: File, options: UploadOptions = {}): FileValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 检查文件大小
  if (opts.maxSize && file.size > opts.maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制 (${formatFileSize(opts.maxSize)})`
    };
  }

  // 检查文件类型
  if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${file.type}`
    };
  }

  return { valid: true };
}

/**
 * 压缩图片
 */
export function compressImage(
  file: File,
  options: UploadOptions = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算新的尺寸
      let { width, height } = img;
      
      if (opts.maxWidth && width > opts.maxWidth) {
        height = (height * opts.maxWidth) / width;
        width = opts.maxWidth;
      }
      
      if (opts.maxHeight && height > opts.maxHeight) {
        width = (width * opts.maxHeight) / height;
        height = opts.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        file.type,
        opts.quality
      );
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 上传单个文件
 */
export async function uploadFile(
  file: File,
  endpoint: string = '/api/upload',
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    // 验证文件
    const validation = validateFile(file, options);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // 压缩图片（如果需要）
    let processedFile = file;
    if (file.type.startsWith('image/') && options.quality) {
      try {
        processedFile = await compressImage(file, options);
      } catch (error) {
        console.warn('图片压缩失败，使用原文件:', error);
      }
    }

    // 创建FormData
    const formData = new FormData();
    formData.append('file', processedFile);

    // 上传文件
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `上传失败: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      url: result.url,
      filename: result.filename,
      size: processedFile.size,
      type: processedFile.type,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

/**
 * 批量上传文件
 */
export async function uploadFiles(
  files: File[],
  endpoint: string = '/api/upload',
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadFile(file, endpoint, options);
    results.push(result);
  }
  
  return results;
}

/**
 * 上传文件并显示进度
 */
export function uploadFileWithProgress(
  file: File,
  endpoint: string = '/api/upload',
  options: UploadOptions = {},
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return new Promise(async (resolve) => {
    try {
      // 验证文件
      const validation = validateFile(file, options);
      if (!validation.valid) {
        resolve({
          success: false,
          error: validation.error
        });
        return;
      }

      // 压缩图片（如果需要）
      let processedFile = file;
      if (file.type.startsWith('image/') && options.quality) {
        try {
          processedFile = await compressImage(file, options);
        } catch (error) {
          console.warn('图片压缩失败，使用原文件:', error);
        }
      }

      // 创建XMLHttpRequest以支持进度回调
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', processedFile);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              url: result.url,
              filename: result.filename,
              size: processedFile.size,
              type: processedFile.type,
            });
          } catch (error) {
            resolve({
              success: false,
              error: '响应解析失败'
            });
          }
        } else {
          resolve({
            success: false,
            error: `上传失败: ${xhr.status}`
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: '网络错误'
        });
      });

      xhr.open('POST', endpoint);
      xhr.send(formData);
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      });
    }
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  
  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
}

/**
 * 检查文件是否为图片
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 检查文件是否为视频
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * 检查文件是否为文档
 */
export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];
  return documentTypes.includes(file.type);
}

/**
 * 创建文件预览URL
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * 释放文件预览URL
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}