/**
 * Multer配置文件
 * 用于处理文件上传的中间件配置
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SolutionFileType } from '@prisma/client';

// 文件类型映射
export const FILE_TYPE_MAP: Record<string, SolutionFileType> = {
  // 图片文件
  'image/jpeg': SolutionFileType.IMAGE,
  'image/png': SolutionFileType.IMAGE,
  'image/gif': SolutionFileType.IMAGE,
  'image/webp': SolutionFileType.IMAGE,
  'image/svg+xml': SolutionFileType.IMAGE,
  
  // 文档文件
  'application/pdf': SolutionFileType.DOCUMENT,
  'application/msword': SolutionFileType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': SolutionFileType.DOCUMENT,
  'text/plain': SolutionFileType.DOCUMENT,
  
  // CAD文件
  'application/dwg': SolutionFileType.CAD_FILE,
  'application/dxf': SolutionFileType.CAD_FILE,
  'model/step': SolutionFileType.CAD_FILE,
  'model/iges': SolutionFileType.CAD_FILE,
  
  // 代码文件
  'text/javascript': SolutionFileType.CODE,
  'text/typescript': SolutionFileType.CODE,
  'text/python': SolutionFileType.CODE,
  'text/cpp': SolutionFileType.CODE,
  'text/c': SolutionFileType.CODE,
  
  // 电路图
  'application/x-kicad-schematic': SolutionFileType.SCHEMATIC,
  'application/x-eagle-schematic': SolutionFileType.SCHEMATIC,
  
  // PCB文件
  'application/x-kicad-pcb': SolutionFileType.PCB,
  'application/x-eagle-pcb': SolutionFileType.PCB,
  
  // 固件文件
  'application/x-firmware': SolutionFileType.FIRMWARE,
  'application/octet-stream': SolutionFileType.FIRMWARE,
  
  // 视频文件
  'video/mp4': SolutionFileType.VIDEO,
  'video/avi': SolutionFileType.VIDEO,
  'video/mov': SolutionFileType.VIDEO,
};

// 上传配置
export const UPLOAD_CONFIG = {
  // 文件大小限制 (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  
  // 允许的文件类型
  ALLOWED_MIME_TYPES: Object.keys(FILE_TYPE_MAP),
  
  // 上传目录
  UPLOAD_DIR: path.join(process.cwd(), 'uploads'),
  
  // 临时目录
  TEMP_DIR: path.join(process.cwd(), 'uploads', 'temp'),
};

// 确保上传目录存在
export function ensureUploadDirs() {
  if (!fs.existsSync(UPLOAD_CONFIG.UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_CONFIG.UPLOAD_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(UPLOAD_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(UPLOAD_CONFIG.TEMP_DIR, { recursive: true });
  }
}

// 生成唯一文件名
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

// 文件过滤器
export function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  // 检查文件类型
  if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`不支持的文件类型: ${file.mimetype}`));
  }
  
  cb(null, true);
}

// 存储配置
export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirs();
    cb(null, UPLOAD_CONFIG.TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

// Multer实例配置
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    files: 10, // 最多10个文件
  },
});

// 文件验证函数
export function validateUploadedFile(file: Express.Multer.File) {
  const errors: string[] = [];
  
  // 检查文件大小
  if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
    errors.push(`文件大小超过限制 (${UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }
  
  // 检查文件类型
  if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push(`不支持的文件类型: ${file.mimetype}`);
  }
  
  // 检查文件名
  if (!file.originalname || file.originalname.length > 255) {
    errors.push('文件名无效或过长');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// 获取文件类型
export function getFileType(mimeType: string): SolutionFileType {
  return FILE_TYPE_MAP[mimeType] || SolutionFileType.OTHER;
}

// 计算文件校验和
export function calculateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => {
      hash.update(data);
    });
    
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
  });
}

// 移动文件到最终位置
export function moveFileToFinalLocation(tempPath: string, finalPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 确保目标目录存在
    const finalDir = path.dirname(finalPath);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    
    // 移动文件
    fs.rename(tempPath, finalPath, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// 删除临时文件
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
}