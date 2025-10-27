import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import mime from 'mime-types';
import { PrismaClient, File } from '@prisma/client';
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface FileUploadOptions {
  maxSize?: number; // 最大文件大小（字节）
  allowedTypes?: string[]; // 允许的文件类型
  generateThumbnail?: boolean; // 是否生成缩略图
}

export interface FileMetadata {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  checksum: string;
  width?: number;
  height?: number;
  format?: string;
}

export class FileService {
  private prisma: PrismaClient;
  private uploadDir: string;
  private thumbnailDir: string;
  private baseUrl: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // 确保上传目录存在
    this.ensureDirectories();
  }

  /**
   * 确保上传目录存在
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
  }

  /**
   * 验证文件
   */
  private validateFile(file: UploadedFile, options: FileUploadOptions): void {
    // 检查文件大小
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(`文件大小超过限制: ${file.size} > ${options.maxSize}`);
    }

    // 检查文件类型
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new Error(`不支持的文件类型: ${file.mimetype}`);
    }
  }

  /**
   * 生成文件名
   */
  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * 计算文件校验和
   */
  private calculateChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(filePath: string, filename: string): Promise<string | null> {
    try {
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);

      await sharp(filePath)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return `/thumbnails/${thumbnailFilename}`;
    } catch (error) {
      console.error('生成缩略图失败:', error);
      return null;
    }
  }

  /**
   * 获取图片尺寸
   */
  private async getImageDimensions(filePath: string): Promise<{ width?: number; height?: number }> {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: UploadedFile,
    userId: string,
    options: FileUploadOptions = {}
  ): Promise<File> {
    try {
      // 设置默认选项
      const defaultOptions: FileUploadOptions = {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'application/zip',
          'application/x-zip-compressed',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        generateThumbnail: true
      };

      const finalOptions = { ...defaultOptions, ...options };

      // 验证文件
      this.validateFile(file, finalOptions);

      // 生成文件名和路径
      const filename = this.generateFilename(file.originalname);
      const filePath = path.join(this.uploadDir, filename);

      // 保存文件
      fs.writeFileSync(filePath, file.buffer);

      // 计算校验和
      const checksum = this.calculateChecksum(filePath);

      // 获取图片尺寸
      const dimensions = file.mimetype.startsWith('image/') 
        ? await this.getImageDimensions(filePath)
        : {};

      // 生成缩略图
      let thumbnailUrl: string | null = null;
      if (finalOptions.generateThumbnail && file.mimetype.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(filePath, filename);
      }

      // 保存到数据库
      const savedFile = await this.prisma.file.create({
        data: {
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: filePath,
          url: `/uploads/${filename}`,
          thumbnailUrl,
          checksum,
          width: dimensions.width,
          height: dimensions.height,
          uploadedBy: userId,
        }
      });

      return savedFile;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw new Error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量上传文件
   */
  async uploadMultipleFiles(
    files: UploadedFile[],
    userId: string,
    options: FileUploadOptions = {}
  ): Promise<File[]> {
    const results: File[] = [];

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadFile(file, userId, options);
        results.push(uploadedFile);
      } catch (error) {
        console.error(`文件上传失败 ${file.originalname}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filename: string): Promise<FileMetadata | null> {
    const file = await this.prisma.file.findUnique({
      where: { filename }
    });

    if (!file) {
      return null;
    }

    return {
      originalName: file.originalName,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      url: file.url,
      thumbnailUrl: file.thumbnailUrl || undefined,
      checksum: file.checksum,
      width: file.width || undefined,
      height: file.height || undefined
    };
  }

  /**
   * 下载文件
   */
  async downloadFile(filename: string): Promise<{ filePath: string; metadata: FileMetadata } | null> {
    const metadata = await this.getFileInfo(filename);
    if (!metadata) {
      return null;
    }

    // 检查文件是否存在
    if (!fs.existsSync(metadata.path)) {
      throw new Error('文件不存在');
    }

    return {
      filePath: metadata.path,
      metadata
    };
  }

  /**
   * 删除文件
   */
  async deleteFile(filename: string, userId: string): Promise<boolean> {
    const file = await this.prisma.file.findUnique({
      where: { filename }
    });

    if (!file) {
      return false;
    }

    // 检查权限（只有上传者可以删除）
    if (file.uploadedBy !== userId) {
      throw new Error('无权限删除此文件');
    }

    try {
      // 删除物理文件
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // 删除缩略图
      if (file.thumbnailUrl) {
        const thumbnailFilename = path.basename(file.thumbnailUrl);
        const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }

      // 从数据库删除记录
      await this.prisma.file.delete({
        where: { filename }
      });

      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户文件列表
   */
  async getUserFiles(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ files: FileMetadata[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: { uploadedBy: userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.file.count({
        where: { uploadedBy: userId }
      })
    ]);

    const fileMetadata: FileMetadata[] = files.map(file => ({
      originalName: file.originalName,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      url: file.url,
      thumbnailUrl: file.thumbnailUrl || undefined,
      checksum: file.checksum,
      width: file.width || undefined,
      height: file.height || undefined
    }));

    return {
      files: fileMetadata,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles(): Promise<number> {
    // 获取30天前的日期
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredFiles = await this.prisma.file.findMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        // 删除物理文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        // 删除缩略图
        if (file.thumbnailUrl) {
          const thumbnailFilename = path.basename(file.thumbnailUrl);
          const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        }

        // 从数据库删除
        await this.prisma.file.delete({
          where: { id: file.id }
        });

        deletedCount++;
      } catch (error) {
        console.error(`清理文件失败 ${file.filename}:`, error);
      }
    }

    return deletedCount;
  }
}

// 导出单例实例
export const fileService = new FileService();