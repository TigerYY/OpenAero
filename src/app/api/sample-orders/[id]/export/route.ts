import fs from 'fs/promises';
import path from 'path';

import JSZip from 'jszip';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

// GET /api/sample-orders/[id]/export - 导出试产订单文件
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取试产订单详情
    const sampleOrder = await (prisma as any).sampleOrder.findUnique({
      where: { id: params.id },
      include: {
        factory: {
          select: {
            name: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
            address: true
          }
        },
        solution: {
          select: {
            title: true,
            description: true,
            category: true,
            features: true,
            specs: true,
            bom: true
          }
        }
      }
    });

    if (!sampleOrder) {
      return NextResponse.json(
        { success: false, error: '试产订单不存在' },
        { status: 404 }
      );
    }

    // 创建 ZIP 文件
    const zip = new JSZip();

    // 添加订单信息文件
    const orderInfo = {
      订单号: sampleOrder.orderNumber,
      工厂信息: {
        名称: sampleOrder.factory.name,
        联系人: sampleOrder.factory.contactName,
        电话: sampleOrder.factory.contactPhone,
        邮箱: sampleOrder.factory.contactEmail,
        地址: sampleOrder.factory.address
      },
      产品信息: {
        标题: sampleOrder.solution.title,
        描述: sampleOrder.solution.description,
        类别: sampleOrder.solution.category,
        功能特性: sampleOrder.solution.features,
        技术规格: sampleOrder.solution.specs,
        BOM清单: sampleOrder.solution.bom
      },
      订单详情: {
        数量: sampleOrder.quantity,
        截止时间: sampleOrder.deadline,
        状态: sampleOrder.status,
        备注: sampleOrder.notes,
        特殊要求: sampleOrder.requirements,
        预估成本: sampleOrder.estimatedCost,
        实际成本: sampleOrder.actualCost
      },
      时间记录: {
        创建时间: sampleOrder.createdAt,
        确认时间: sampleOrder.confirmedAt,
        开始生产时间: sampleOrder.startedAt,
        完成时间: sampleOrder.completedAt,
        交付时间: sampleOrder.deliveredAt
      }
    };

    zip.file('订单信息.json', JSON.stringify(orderInfo, null, 2));

    // 添加规格文件
    if (sampleOrder.specFiles && sampleOrder.specFiles.length > 0) {
      const specFolder = zip.folder('规格文件');
      
      for (let i = 0; i < sampleOrder.specFiles.length; i++) {
        const fileUrl = sampleOrder.specFiles[i];
        try {
          // 这里假设文件存储在本地，实际项目中可能需要从云存储下载
          const fileName = path.basename(fileUrl);
          const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
          
          try {
            const fileBuffer = await fs.readFile(filePath);
            specFolder?.file(fileName, fileBuffer);
          } catch (fileError) {
            // 如果文件不存在，添加一个说明文件
            specFolder?.file(`${fileName}.txt`, `文件链接: ${fileUrl}\n注意: 原文件未找到`);
          }
        } catch (error) {
          console.error(`处理规格文件失败: ${fileUrl}`, error);
        }
      }
    }

    // 添加结果文件
    if (sampleOrder.resultFiles && sampleOrder.resultFiles.length > 0) {
      const resultFolder = zip.folder('结果文件');
      
      for (let i = 0; i < sampleOrder.resultFiles.length; i++) {
        const fileUrl = sampleOrder.resultFiles[i];
        try {
          const fileName = path.basename(fileUrl);
          const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
          
          try {
            const fileBuffer = await fs.readFile(filePath);
            resultFolder?.file(fileName, fileBuffer);
          } catch (fileError) {
            // 如果文件不存在，添加一个说明文件
            resultFolder?.file(`${fileName}.txt`, `文件链接: ${fileUrl}\n注意: 原文件未找到`);
          }
        } catch (error) {
          console.error(`处理结果文件失败: ${fileUrl}`, error);
        }
      }
    }

    // 生成 ZIP 文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 设置响应头
    const fileName = `试产订单_${sampleOrder.orderNumber}_${new Date().toISOString().split('T')[0]}.zip`;
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': zipBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('导出试产订单文件失败:', error);
    return NextResponse.json(
      { success: false, error: '导出文件失败' },
      { status: 500 }
    );
  }
}