import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logUserAction } from '@/backend/auth/auth.middleware';
import { ApiResponse } from '@/types';
import { fileService } from '@/backend/file/file.service';
import { authenticateRequest } from '@/lib/auth-helpers';

// POST /api/solutions/upload - 上传方案相关文件
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const user = authResult.user!;

    // 检查用户是否为认证创作者
    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true }
    });

    if (!creator || creator.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only approved creators can upload solution files',
          code: 403,
        } as ApiResponse,
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const solutionId = formData.get('solutionId') as string;
    const fileType = formData.get('fileType') as string || 'DOCUMENT';

    if (!files || files.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: '请选择要上传的文件',
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 验证方案是否存在且属于当前用户
    if (solutionId) {
      const solution = await db.solution.findFirst({
        where: {
          id: solutionId,
          userId: authResult.user.id
        }
      });

      if (!solution) {
        const response: ApiResponse<null> = {
          success: false,
          error: '方案不存在或无权限访问',
          data: null
        };
        return NextResponse.json(response, { status: 404 });
      }
    }

    // 设置文件上传选项
    const uploadOptions = {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/zip',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      generateThumbnail: fileType === 'IMAGE'
    };

    const uploadedFiles = [];
    const errors = [];

    // 处理每个文件
    for (const file of files) {
      try {
        // 转换File对象为UploadedFile格式
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadedFile = {
          fieldname: 'file',
          originalname: file.name,
          encoding: '7bit',
          mimetype: file.type,
          size: file.size,
          destination: '',
          filename: '',
          path: '',
          buffer
        };

        // 上传文件
        const fileRecord = await fileService.uploadFile(
          uploadedFile,
          authResult.user.id,
          uploadOptions
        );

        // 如果指定了方案ID，关联文件到方案
        if (solutionId) {
          await db.solutionFile.create({
            data: {
              solutionId,
              fileId: fileRecord.id,
              fileType: fileType as any,
              displayName: file.name
            }
          });
        }

        uploadedFiles.push({
          id: fileRecord.id,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName,
          url: fileRecord.url,
          thumbnailUrl: fileRecord.thumbnailUrl,
          size: fileRecord.size,
          mimeType: fileRecord.mimeType
        });

        // 记录审计日志
        await logUserAction(
          user.id,
          'FILE_UPLOAD',
          'solution_file',
          fileRecord.id,
          undefined,
          { 
            filename: fileRecord.filename,
            fileType,
            solutionId,
            fileSize: fileRecord.size
          }
        );
      } catch (error: any) {
        console.error(`文件上传失败: ${file.name}`, error);
        errors.push({
          filename: file.name,
          error: error.message || '上传失败'
        });
      }
    }

    const response: ApiResponse<any> = {
      success: uploadedFiles.length > 0,
      data: {
        uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      }
    };

    return NextResponse.json(response, { 
      status: uploadedFiles.length > 0 ? 200 : 400 
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: '文件上传失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/solutions/upload - 删除方案文件
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const user = authResult.user!;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const solutionId = searchParams.get('solutionId');

    if (!fileId) {
      const response: ApiResponse<null> = {
        success: false,
        error: '文件ID不能为空',
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 验证文件权限
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId: user.id
      }
    });

    if (!file) {
      const response: ApiResponse<null> = {
        success: false,
        error: '文件不存在或无权限访问',
        data: null
      };
      return NextResponse.json(response, { status: 404 });
    }

    // 如果指定了方案ID，删除方案文件关联
    if (solutionId) {
      await db.solutionFile.deleteMany({
        where: {
          solutionId,
          fileId
        }
      });
    }

    // 删除文件
    await fileService.deleteFile(file.filename, user.id);

    // 记录审计日志
    await logUserAction(
      user.id,
      'FILE_DELETE',
      'solution_file',
      fileId,
      undefined,
      { filename: file.filename }
    );

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('删除文件失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: '删除文件失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}