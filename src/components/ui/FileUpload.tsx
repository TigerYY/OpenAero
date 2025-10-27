'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './Button';
import { 
  uploadFileWithProgress, 
  validateFile, 
  formatFileSize, 
  isImageFile,
  isVideoFile,
  isDocumentFile,
  createPreviewUrl,
  revokePreviewUrl,
  UploadOptions,
  UploadResult 
} from '@/lib/file-upload';

interface FileUploadProps {
  onUpload?: (results: UploadResult[]) => void;
  onProgress?: (filename: string, progress: number) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  options?: UploadOptions;
  showPreview?: boolean;
  autoUpload?: boolean;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  progress?: number;
  result?: UploadResult;
  uploading?: boolean;
  id: string;
}

export function FileUpload({
  onUpload,
  onProgress,
  multiple = false,
  accept,
  maxSize,
  maxFiles = 10,
  disabled = false,
  className = '',
  children,
  options = {},
  showPreview = true,
  autoUpload = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadOptions: UploadOptions = {
    maxSize: maxSize || 100 * 1024 * 1024, // 100MB
    ...options,
  };

  // 清理预览URL
  useEffect(() => {
    return () => {
      files.forEach(fileWithPreview => {
        if (fileWithPreview.preview) {
          revokePreviewUrl(fileWithPreview.preview);
        }
      });
    };
  }, []);

  const generateFileId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithPreview[] = [];
    const fileArray = Array.from(selectedFiles);

    // 检查文件数量限制
    if (files.length + fileArray.length > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    for (const file of fileArray) {
      // 验证文件
      const validation = validateFile(file, uploadOptions);
      if (!validation.valid) {
        alert(`文件 "${file.name}" 验证失败: ${validation.error}`);
        continue;
      }

      // 创建预览
      let preview: string | undefined;
      if (showPreview && isImageFile(file)) {
        preview = createPreviewUrl(file);
      }

      const fileWithPreview: FileWithPreview = {
        file,
        preview,
        progress: 0,
        uploading: false,
        id: generateFileId(),
      };

      newFiles.push(fileWithPreview);
    }

    setFiles(prev => [...prev, ...newFiles]);

    // 自动上传
    if (autoUpload && newFiles.length > 0) {
      setTimeout(() => {
        uploadFiles(newFiles);
      }, 100);
    }
  }, [files.length, maxFiles, uploadOptions, showPreview, autoUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // 清空input值，允许重复选择同一文件
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFileSelect]);

  const uploadFile = async (fileWithPreview: FileWithPreview) => {
    const fileIndex = files.findIndex(f => f.id === fileWithPreview.id);
    if (fileIndex === -1) return;

    setFiles(prev => prev.map(f => 
      f.id === fileWithPreview.id ? { ...f, uploading: true, progress: 0 } : f
    ));

    try {
      const result = await uploadFileWithProgress(
        fileWithPreview.file,
        '/api/upload',
        uploadOptions,
        (progress) => {
          setFiles(prev => prev.map(f => 
            f.id === fileWithPreview.id ? { ...f, progress } : f
          ));
          onProgress?.(fileWithPreview.file.name, progress);
        }
      );

      setFiles(prev => prev.map(f => 
        f.id === fileWithPreview.id ? { ...f, result, uploading: false, progress: 100 } : f
      ));

      return result;
    } catch (error) {
      const errorResult: UploadResult = {
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      };

      setFiles(prev => prev.map(f => 
        f.id === fileWithPreview.id ? { ...f, result: errorResult, uploading: false } : f
      ));

      return errorResult;
    }
  };

  const uploadFiles = async (filesToUpload?: FileWithPreview[]) => {
    const targetFiles = filesToUpload || files.filter(f => !f.result);
    const results: UploadResult[] = [];
    
    for (const fileWithPreview of targetFiles) {
      if (!fileWithPreview.result) {
        const result = await uploadFile(fileWithPreview);
        results.push(result);
      }
    }

    onUpload?.(results);
  };

  const uploadAllFiles = async () => {
    await uploadFiles();
  };

  const removeFile = (id: string) => {
    const fileWithPreview = files.find(f => f.id === id);
    if (fileWithPreview?.preview) {
      revokePreviewUrl(fileWithPreview.preview);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFiles = () => {
    files.forEach(f => {
      if (f.preview) {
        revokePreviewUrl(f.preview);
      }
    });
    setFiles([]);
  };

  const retryUpload = (id: string) => {
    const fileWithPreview = files.find(f => f.id === id);
    if (fileWithPreview) {
      uploadFile(fileWithPreview);
    }
  };

  const getFileIcon = (file: File) => {
    if (isImageFile(file)) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (isVideoFile(file)) {
      return (
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (isDocumentFile(file)) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
  };

  const getFilePreview = (fileWithPreview: FileWithPreview) => {
    if (fileWithPreview.preview) {
      return (
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={fileWithPreview.preview}
            alt="预览"
            className="w-full h-full object-cover"
          />
        </div>
      );
    } else if (isVideoFile(fileWithPreview.file)) {
      return (
        <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          {getFileIcon(fileWithPreview.file)}
        </div>
      );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 拖拽上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-in-out
          ${isDragOver
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        {children || (
          <div className="space-y-4">
            {/* 上传图标 */}
            <div className={`mx-auto transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
              <svg className="mx-auto h-16 w-16 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            
            {/* 提示文字 */}
            <div className="text-gray-600">
              <p className="text-lg font-medium">
                {isDragOver ? '松开鼠标上传文件' : '拖拽文件到此处或点击选择'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                支持 {accept || '所有格式'}，单个文件最大 {formatFileSize(maxSize || 100 * 1024 * 1024)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                最多可上传 {maxFiles} 个文件
              </p>
            </div>
          </div>
        )}

        {/* 拖拽覆盖层 */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl flex items-center justify-center">
            <div className="text-blue-600 font-medium text-lg">
              松开鼠标上传文件
            </div>
          </div>
        )}
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* 操作按钮 */}
          {!autoUpload && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                已选择 {files.length} 个文件
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={uploadAllFiles}
                  disabled={disabled || files.every(f => f.result || f.uploading)}
                >
                  上传全部
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={disabled}
                >
                  清空
                </Button>
              </div>
            </div>
          )}

          {/* 文件项列表 */}
          <div className="space-y-3">
            {files.map((fileWithPreview) => (
              <div key={fileWithPreview.id} className="flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* 文件预览 */}
                {getFilePreview(fileWithPreview)}

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileWithPreview.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(fileWithPreview.file.size)}
                  </p>

                  {/* 上传进度 */}
                  {fileWithPreview.uploading && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileWithPreview.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        上传中... {Math.round(fileWithPreview.progress || 0)}%
                      </p>
                    </div>
                  )}

                  {/* 上传结果 */}
                  {fileWithPreview.result && (
                    <div className="mt-2 flex items-center gap-2">
                      {fileWithPreview.result.success ? (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-green-600">上传成功</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-xs text-red-600">
                              {fileWithPreview.result.error}
                            </span>
                          </div>
                          <button
                            onClick={() => retryUpload(fileWithPreview.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            重试
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => removeFile(fileWithPreview.id)}
                    disabled={disabled || fileWithPreview.uploading}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}