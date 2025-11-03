'use client';

import { Upload, X, File, Image, Video, FileText, Camera, FolderOpen, Plus, Check, AlertCircle } from 'lucide-react';
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  progress?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface MobileFileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onProgress?: (filename: string, progress: number) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
  enableCamera?: boolean;
  enableMultiSelect?: boolean;
  autoUpload?: boolean;
}

const MobileFileUpload: React.FC<MobileFileUploadProps> = ({
  onUploadComplete,
  onProgress,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['image/*', 'video/*', 'application/pdf', 'text/*'],
  className = '',
  enableCamera = true,
  enableMultiSelect = true,
  autoUpload = false
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 清理预览URL
  useEffect(() => {
    return () => {
      files.forEach(fileWithPreview => {
        if (fileWithPreview.preview) {
          URL.revokeObjectURL(fileWithPreview.preview);
        }
      });
    };
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6 text-purple-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-6 h-6 text-red-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `文件 "${file.name}" 超过最大大小限制 ${formatFileSize(maxSize)}`;
    }

    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `文件 "${file.name}" 类型不被支持`;
    }

    return null;
  };

  const createPreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const newFiles = Array.from(selectedFiles);
    
    if (files.length + newFiles.length > maxFiles) {
      setError(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    const validationErrors: string[] = [];
    const validFiles: FileWithPreview[] = [];

    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push({
          file,
          preview: createPreview(file),
          status: 'pending'
        });
      }
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setError('');
    setFiles(prev => [...prev, ...validFiles]);

    // 自动上传
    if (autoUpload && validFiles.length > 0) {
      setTimeout(() => uploadFiles(validFiles), 100);
    }
  }, [files.length, maxFiles, autoUpload]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const removedFile = newFiles[index];
      if (removedFile && removedFile.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async (filesToUpload?: FileWithPreview[]) => {
    const targetFiles = filesToUpload || files.filter(f => f.status === 'pending');
    if (targetFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {
      // 更新状态为上传中
      setFiles(prev => prev.map(f => 
        targetFiles.includes(f) ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      const formData = new FormData();
      targetFiles.forEach(fileWithPreview => {
        formData.append('files', fileWithPreview.file);
      });

      // 使用 XMLHttpRequest 支持进度回调
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setFiles(prev => prev.map(f => 
            targetFiles.includes(f) ? { ...f, progress } : f
          ));
          
          if (onProgress) {
            targetFiles.forEach(f => onProgress(f.file.name, progress));
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            setUploadedFiles(prev => [...prev, ...result.files]);
            
            // 更新状态为成功
            setFiles(prev => prev.map(f => 
              targetFiles.includes(f) ? { ...f, status: 'success' as const, progress: 100 } : f
            ));
            
            if (onUploadComplete) {
              onUploadComplete(result.files);
            }
          } catch (error) {
            setError('响应解析失败');
            setFiles(prev => prev.map(f => 
              targetFiles.includes(f) ? { ...f, status: 'error' as const, error: '响应解析失败' } : f
            ));
          }
        } else {
          const errorMsg = `上传失败: ${xhr.status}`;
          setError(errorMsg);
          setFiles(prev => prev.map(f => 
            targetFiles.includes(f) ? { ...f, status: 'error' as const, error: errorMsg } : f
          ));
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        const errorMsg = '网络错误';
        setError(errorMsg);
        setFiles(prev => prev.map(f => 
          targetFiles.includes(f) ? { ...f, status: 'error' as const, error: errorMsg } : f
        ));
        setUploading(false);
      });

      xhr.open('POST', '/api/files/upload');
      xhr.send(formData);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上传失败';
      setError(errorMsg);
      setFiles(prev => prev.map(f => 
        targetFiles.includes(f) ? { ...f, status: 'error' as const, error: errorMsg } : f
      ));
      setUploading(false);
    }
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 如果移动距离很小，认为是点击
    if (distance < 10) {
      fileInputRef.current?.click();
    }
    
    setTouchStart(null);
  };

  // 拖拽事件处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const clearAllFiles = () => {
    files.forEach(fileWithPreview => {
      if (fileWithPreview.preview) {
        URL.revokeObjectURL(fileWithPreview.preview);
      }
    });
    setFiles([]);
    setError('');
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 文件选择区域 */}
      <div
        ref={dropZoneRef}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          拖拽文件到此处或点击选择
        </p>
        <p className="text-sm text-gray-500 mb-4">
          支持 {acceptedTypes.join(', ')} 格式，最大 {formatFileSize(maxSize)}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            选择文件
          </button>
          
          {enableCamera && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Camera className="w-4 h-4" />
              拍照
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={enableMultiSelect}
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        {enableCamera && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
          />
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              文件列表 ({files.length}/{maxFiles})
            </h3>
            <div className="flex gap-2">
              {!autoUpload && (
                <button
                  onClick={() => uploadFiles()}
                  disabled={uploading || files.every(f => f.status !== 'pending')}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? '上传中...' : '上传全部'}
                </button>
              )}
              <button
                onClick={clearAllFiles}
                disabled={uploading}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                清空
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {files.map((fileWithPreview, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* 预览或图标 */}
                  <div className="flex-shrink-0">
                    {fileWithPreview.preview ? (
                      <img
                        src={fileWithPreview.preview}
                        alt="预览"
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getFileIcon(fileWithPreview.file.type)}
                      </div>
                    )}
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {fileWithPreview.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileWithPreview.file.size)}
                    </p>
                    
                    {/* 进度条 */}
                    {fileWithPreview.status === 'uploading' && fileWithPreview.progress !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileWithPreview.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(fileWithPreview.progress || 0)}%
                        </p>
                      </div>
                    )}
                    
                    {/* 错误信息 */}
                    {fileWithPreview.status === 'error' && fileWithPreview.error && (
                      <p className="text-sm text-red-500 mt-1">
                        {fileWithPreview.error}
                      </p>
                    )}
                  </div>

                  {/* 状态和操作 */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(fileWithPreview.status)}
                    <button
                      onClick={() => removeFile(index)}
                      disabled={fileWithPreview.status === 'uploading'}
                      className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">
            上传成功 ({uploadedFiles.length})
          </h3>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    查看
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFileUpload;