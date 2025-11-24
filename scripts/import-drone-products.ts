/**
 * 导入植保无人机产品到商城
 * 从 HTML 报价说明书中提取产品信息并导入到数据库
 */

import { resolve } from 'path';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

// 产品数据（从 HTML 文件中提取）
const products = [
  // 20L植保无人机（A型）- 海外版
  {
    name: '20L植保无人机 F20-A系列（海外版）',
    slug: 'f20-a-overseas',
    model: 'ZBF-20L-AF',
    description: `20L植保无人机 F20-A系列（海外版），采用4轴20公斤植保机多旋翼载支架+20L水箱设计。

主要配置：
- 结构套件：4轴20公斤植保机多旋翼载支架+20L水箱
- 动力系统：12S无人机动力套装，最大拉力27KG/轴
- 电池：48V/12S智能16000mah锂电池
- 飞控系统：四轴多轴APM飞控，自动定点巡航，失控返航（海外版）
- 喷洒系统：8L/min水泵，加长杆喷头，8mm扇形锥形喷嘴
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

适用于海外市场的植保作业需求，支持自动定点巡航和失控返航功能。`,
    shortDesc: '20L植保无人机，4轴设计，最大载重20公斤，适用于海外市场',
    sku: 'ZBF-20L-AF',
    price: 17949.3,
    category: '植保无人机',
    version: '海外版',
    series: 'F20-A',
    capacity: '20L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '4轴20公斤植保机多旋翼载支架+20L水箱',
        price: 2720.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '12S无人机动力套装 最大拉力 27KG/轴，含电机电调螺旋桨安装座',
        price: 5600.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/12S智能16000mah锂电池', price: 1850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '8L/min水泵/12-14S锂电池，喷洒抽水泵',
        price: 350.0,
      },
      { category: '喷洒套件', name: '折叠喷杆', spec: '加长杆喷头，8mm扇形锥形喷嘴', price: 514.9 },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴多轴APM飞控，自动定点巡航，失控返航（海外版）',
        price: 476.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（海外版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 20L植保无人机（A型）- 国内版
  {
    name: '20L植保无人机 F20-A系列（国内版）',
    slug: 'f20-a-domestic',
    model: 'ZBF-20-AD',
    description: `20L植保无人机 F20-A系列（国内版），采用4轴20公斤植保机多旋翼载支架+20L水箱设计。

主要配置：
- 结构套件：4轴20公斤植保机多旋翼载支架+20L水箱
- 动力系统：12S无人机动力套装，最大拉力27KG/轴
- 电池：48V/12S智能16000mah锂电池
- 飞控系统：四轴多轴APM飞控，自动定点巡航，失控返航（国内版）
- 喷洒系统：8L/min水泵，加长杆喷头，8mm扇形锥形喷嘴
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

适用于国内市场的植保作业需求，支持自动定点巡航和失控返航功能。`,
    shortDesc: '20L植保无人机，4轴设计，最大载重20公斤，适用于国内市场',
    sku: 'ZBF-20-AD',
    price: 17883.3,
    category: '植保无人机',
    version: '国内版',
    series: 'F20-A',
    capacity: '20L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '4轴20公斤植保机多旋翼载支架+20L水箱',
        price: 2720.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '12S无人机动力套装 最大拉力 27KG/轴，含电机电调螺旋桨安装座',
        price: 5600.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/12S智能16000mah锂电池', price: 1850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '8L/min水泵/12-14S锂电池，喷洒抽水泵',
        price: 350.0,
      },
      { category: '喷洒套件', name: '折叠喷杆', spec: '加长杆喷头，8mm扇形锥形喷嘴', price: 514.9 },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴多轴APM飞控，自动定点巡航，失控返航（国内版）',
        price: 410.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（国内版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 20L植保无人机（B型）- 海外版
  {
    name: '20L植保无人机 F20-B系列（海外版）',
    slug: 'f20-b-overseas',
    model: 'ZBF-20L-BF',
    description: `20L植保无人机 F20-B系列（海外版），采用6轴22公斤植保机多旋翼载支架+22L水箱设计。

主要配置：
- 结构套件：6轴22公斤植保机多旋翼载支架+22L水箱
- 动力系统：12S无人机动力套装，最大拉力22KG/轴
- 电池：48V/12S智能16000mah锂电池
- 飞控系统：四轴/多轴APM飞控，自动定点巡航，失控返航（海外版）
- 喷洒系统：8L/min水泵，加长杆喷头，8mm扇形锥形喷嘴
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

6轴设计提供更好的稳定性和载重能力，适用于海外市场的植保作业需求。`,
    shortDesc: '20L植保无人机，6轴设计，最大载重22公斤，适用于海外市场',
    sku: 'ZBF-20L-BF',
    price: 19708.3,
    category: '植保无人机',
    version: '海外版',
    series: 'F20-B',
    capacity: '20L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '6轴22公斤植保机多旋翼载支架+22L水箱',
        price: 2999.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '12S无人机动力套装 最大拉力 22KG/轴，含电机电调螺旋桨安装座',
        price: 7080.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/12S智能16000mah锂电池', price: 1850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '8L/min水泵/12-14S锂电池，喷洒抽水泵',
        price: 350.0,
      },
      { category: '喷洒套件', name: '折叠喷杆', spec: '加长杆喷头，8mm扇形锥形喷嘴', price: 514.9 },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴/多轴APM飞控，自动定点巡航，失控返航（海外版）',
        price: 476.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（海外版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 20L植保无人机（B型）- 国内版
  {
    name: '20L植保无人机 F20-B系列（国内版）',
    slug: 'f20-b-domestic',
    model: 'ZBF-20L-BD',
    description: `20L植保无人机 F20-B系列（国内版），采用6轴22公斤植保机多旋翼载支架+22L水箱设计。

主要配置：
- 结构套件：6轴22公斤植保机多旋翼载支架+22L水箱
- 动力系统：12S无人机动力套装，最大拉力22KG/轴
- 电池：48V/12S智能16000mah锂电池
- 飞控系统：四轴/多轴APM飞控，自动定点巡航，失控返航（国内版）
- 喷洒系统：8L/min水泵，加长杆喷头，8mm扇形锥形喷嘴
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

6轴设计提供更好的稳定性和载重能力，适用于国内市场的植保作业需求。`,
    shortDesc: '20L植保无人机，6轴设计，最大载重22公斤，适用于国内市场',
    sku: 'ZBF-20L-BD',
    price: 19642.3,
    category: '植保无人机',
    version: '国内版',
    series: 'F20-B',
    capacity: '20L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '6轴22公斤植保机多旋翼载支架+22L水箱',
        price: 2999.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '12S无人机动力套装 最大拉力 22KG/轴，含电机电调螺旋桨安装座',
        price: 7080.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/12S智能16000mah锂电池', price: 1850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '8L/min水泵/12-14S锂电池，喷洒抽水泵',
        price: 350.0,
      },
      { category: '喷洒套件', name: '折叠喷杆', spec: '加长杆喷头，8mm扇形锥形喷嘴', price: 514.9 },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴/多轴APM飞控，自动定点巡航，失控返航（国内版）',
        price: 410.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（国内版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 30L植保无人机（A型）- 海外版
  {
    name: '30L植保无人机 F30-A系列（海外版）',
    slug: 'f30-a-overseas',
    model: 'ZBF-30L-AF',
    description: `30L植保无人机 F30-A系列（海外版），采用4轴30公斤植保机多旋翼载支架+30L水箱设计。

主要配置：
- 结构套件：4轴30公斤植保机多旋翼载支架+30L水箱
- 动力系统：14S无人机动力套装，最大拉力37KG/轴
- 电池：48V/14S智能22000mah锂电池
- 飞控系统：四轴/多轴APM飞控，自动定点巡航，失控返航（海外版）
- 喷洒系统：8L/min水泵，加长杆喷头，8mm扇形锥形喷嘴
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

大容量设计，适用于大面积植保作业，适用于海外市场。`,
    shortDesc: '30L植保无人机，4轴设计，最大载重30公斤，适用于海外市场',
    sku: 'ZBF-30L-AF',
    price: 21708.3,
    category: '植保无人机',
    version: '海外版',
    series: 'F30-A',
    capacity: '30L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '4轴30公斤植保机多旋翼载支架+30L水箱',
        price: 4199.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '14S无人机动力套装 最大拉力 37KG/轴，含电机电调螺旋桨安装座',
        price: 6880.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/14S智能22000mah锂电池', price: 2850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '8L/min水泵/12-14S锂电池，喷洒抽水泵',
        price: 350.0,
      },
      { category: '喷洒套件', name: '折叠喷杆', spec: '加长杆喷头，8mm扇形锥形喷嘴', price: 514.9 },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴/多轴APM飞控，自动定点巡航，失控返航（海外版）',
        price: 476.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（海外版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 30L植保无人机（A型）- 国内版
  {
    name: '30L植保无人机 F30-A系列（国内版）',
    slug: 'f30-a-domestic',
    model: 'ZBF-30L-AD',
    description: `30L植保无人机 F30-A系列（国内版），采用4轴30公斤植保机多旋翼载支架+30L水箱设计。

主要配置：
- 结构套件：4轴30公斤植保机多旋翼载支架+30L水箱
- 动力系统：14S无人机动力套装，最大拉力37KG/轴
- 电池：48V/14S智能22000mah锂电池
- 飞控系统：四轴/多轴APM飞控，自动定点巡航，失控返航（国内版）
- 喷洒系统：8L/min水泵，加长杆喷头，8mm扇形锥形喷嘴
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

大容量设计，适用于大面积植保作业，适用于国内市场。`,
    shortDesc: '30L植保无人机，4轴设计，最大载重30公斤，适用于国内市场',
    sku: 'ZBF-30L-AD',
    price: 21642.3,
    category: '植保无人机',
    version: '国内版',
    series: 'F30-A',
    capacity: '30L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '4轴30公斤植保机多旋翼载支架+30L水箱',
        price: 4199.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '14S无人机动力套装 最大拉力 37KG/轴，含电机电调螺旋桨安装座',
        price: 6880.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/14S智能22000mah锂电池', price: 2850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '8L/min水泵/12-14S锂电池，喷洒抽水泵',
        price: 350.0,
      },
      { category: '喷洒套件', name: '折叠喷杆', spec: '加长杆喷头，8mm扇形锥形喷嘴', price: 514.9 },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴/多轴APM飞控，自动定点巡航，失控返航（国内版）',
        price: 410.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（国内版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 30L植保无人机（B型）- 海外版
  {
    name: '30L植保无人机 F30-B系列（海外版）',
    slug: 'f30-b-overseas',
    model: 'ZBF-30L-BF',
    description: `30L植保无人机 F30-B系列（海外版），采用6轴30公斤植保机多旋翼载支架+30L水箱设计。

主要配置：
- 结构套件：6轴30公斤植保机多旋翼载支架+30L水箱
- 动力系统：12S无人机动力套装，最大拉力22KG/轴
- 电池：48V/12S智能22000mah锂电池
- 飞控系统：四轴/多轴APM飞控，自动定点巡航，失控返航（海外版）
- 喷洒系统：好盈水泵 8L/min水泵，农业植保机无人机喷洒系统专用折叠喷杆
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

6轴大容量设计，提供卓越的稳定性和载重能力，适用于海外市场的大面积植保作业。`,
    shortDesc: '30L植保无人机，6轴设计，最大载重30公斤，适用于海外市场',
    sku: 'ZBF-30L-BF',
    price: 23326.3,
    category: '植保无人机',
    version: '海外版',
    series: 'F30-B',
    capacity: '30L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '6轴30公斤植保机多旋翼载支架+30L水箱',
        price: 4299.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '12S无人机动力套装 最大拉力 22KG/轴，含电机电调螺旋桨安装座',
        price: 8400.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/12S智能22000mah锂电池', price: 2850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '好盈水泵 8L/min水泵8L流量12-14S锂电池 植保打药飞机喷洒抽水泵',
        price: 350.0,
      },
      {
        category: '喷洒套件',
        name: '折叠喷杆',
        spec: '农业植保机无人机喷洒系统好盈无刷水泵打药机撒肥机专用折叠喷杆',
        price: 514.9,
      },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴/多轴APM飞控，自动定点巡航，失控返航（海外版）',
        price: 474.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（海外版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（海外版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
  // 30L植保无人机（B型）- 国内版
  {
    name: '30L植保无人机 F30-B系列（国内版）',
    slug: 'f30-b-domestic',
    model: 'ZBF-30L-BD',
    description: `30L植保无人机 F30-B系列（国内版），采用6轴30公斤植保机多旋翼载支架+30L水箱设计。

主要配置：
- 结构套件：6轴30公斤植保机多旋翼载支架+30L水箱
- 动力系统：12S无人机动力套装，最大拉力22KG/轴
- 电池：48V/12S智能22000mah锂电池
- 飞控系统：四轴/多轴APM飞控，自动定点巡航，失控返航（国内版）
- 喷洒系统：好盈水泵 8L/min水泵，农业植保机无人机喷洒系统专用折叠喷杆
- 导航系统：植保专用GPS，24GHZ/100M仿地雷达，24G HZ/25米避障雷达
- 遥控系统：图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）
- 辅助设备：无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充

6轴大容量设计，提供卓越的稳定性和载重能力，适用于国内市场的大面积植保作业。`,
    shortDesc: '30L植保无人机，6轴设计，最大载重30公斤，适用于国内市场',
    sku: 'ZBF-30L-BD',
    price: 23262.3,
    category: '植保无人机',
    version: '国内版',
    series: 'F30-B',
    capacity: '30L',
    components: [
      {
        category: '结构套件',
        name: '机架（含水箱）',
        spec: '6轴30公斤植保机多旋翼载支架+30L水箱',
        price: 4299.0,
      },
      {
        category: '结构套件',
        name: '电机',
        spec: '12S无人机动力套装 最大拉力 22KG/轴，含电机电调螺旋桨安装座',
        price: 8400.0,
      },
      { category: '结构套件', name: '电池', spec: '48V/12S智能22000mah锂电池', price: 2850.0 },
      {
        category: '喷洒套件',
        name: '喷洒抽水泵',
        spec: '好盈水泵 8L/min水泵8L流量12-14S锂电池 植保打药飞机喷洒抽水泵',
        price: 350.0,
      },
      {
        category: '喷洒套件',
        name: '折叠喷杆',
        spec: '农业植保机无人机喷洒系统好盈无刷水泵打药机撒肥机专用折叠喷杆',
        price: 514.9,
      },
      {
        category: '飞控套件',
        name: '飞控',
        spec: '四轴/多轴APM飞控，自动定点巡航，失控返航（国内版）',
        price: 410.0,
      },
      { category: '飞控套件', name: '仿地雷达', spec: '24GHZ/100M仿地雷达', price: 1200.0 },
      { category: '飞控套件', name: 'GPS', spec: '植保专用GPS', price: 360.0 },
      { category: '飞控套件', name: '流量计', spec: '12mm白色流量计', price: 63.0 },
      { category: '飞控套件', name: '避障雷达', spec: '24G HZ/25米避障雷达', price: 1200.0 },
      {
        category: '遥控套件',
        name: '遥控机',
        spec: '图传/遥控/云台/5英寸屏幕/数传一体化遥控器（国内版）',
        price: 2070.0,
      },
      {
        category: '遥控套件',
        name: '摄像头',
        spec: '夜视镜头无人机摄像头/1080P（国内版）',
        price: 169.0,
      },
      {
        category: '辅助设备',
        name: '充电器',
        spec: '无人机锂电池充电器6s-24s锂电池智能充电器2400W平衡充',
        price: 1376.4,
      },
    ],
  },
];

async function main() {
  console.log('🚀 开始导入植保无人机产品...\n');

  try {
    // 1. 查找或创建产品分类
    let category = await prisma.productCategory.findFirst({
      where: { slug: 'plant-protection-drone' },
    });

    if (!category) {
      console.log('📁 创建产品分类：植保无人机');
      category = await prisma.productCategory.create({
        data: {
          name: '植保无人机',
          slug: 'plant-protection-drone',
          description: '专业植保无人机产品，适用于农业植保作业',
        },
      });
      console.log(`✅ 分类创建成功: ${category.name} (ID: ${category.id})\n`);
    } else {
      console.log(`✅ 使用现有分类: ${category.name} (ID: ${category.id})\n`);
    }

    // 2. 导入产品
    let successCount = 0;
    let skipCount = 0;

    for (const productData of products) {
      try {
        // 检查产品是否已存在
        const existing = await prisma.product.findUnique({
          where: { slug: productData.slug },
        });

        if (existing) {
          console.log(`⏭️  产品已存在，跳过: ${productData.name}`);
          skipCount++;
          continue;
        }

        // 生成组件清单描述
        const componentsDesc = productData.components
          .map(comp => {
            const priceStr = comp.price > 0 ? `（¥${comp.price.toFixed(2)}）` : '';
            return `- **${comp.category} - ${comp.name}**：${comp.spec}${priceStr}`;
          })
          .join('\n');

        const fullDescription = `${productData.description}\n\n## 配置清单\n\n${componentsDesc}`;

        // 创建产品
        const product = await prisma.product.create({
          data: {
            name: productData.name,
            slug: productData.slug,
            description: fullDescription,
            short_desc: productData.shortDesc,
            sku: productData.sku,
            model: productData.model,
            brand: '开元空御',
            price: productData.price,
            category_id: category.id,
            status: 'PUBLISHED',
            is_active: true,
            is_featured: productData.series.includes('A'), // A系列作为推荐产品
            images: [
              // 占位图片，后续可以替换为实际产品图片
              `/images/products/${productData.slug}-1.jpg`,
              `/images/products/${productData.slug}-2.jpg`,
            ],
            meta_title: `${productData.name} - 开元空御 OpenAero`,
            meta_description: productData.shortDesc,
            meta_keywords: `植保无人机,${productData.capacity},${productData.series},${productData.version},开元空御`,
            // 添加自定义属性到 dimensions JSON 字段
            dimensions: {
              series: productData.series,
              capacity: productData.capacity,
              version: productData.version,
              components: productData.components,
            },
          },
        });

        // 创建库存记录
        await prisma.productInventory.create({
          data: {
            product_id: product.id,
            quantity: 10, // 默认库存
            available: 10,
            reserved: 0,
            status: 'IN_STOCK',
          },
        });

        // 创建部件清单
        for (let i = 0; i < productData.components.length; i++) {
          const comp = productData.components[i];
          await prisma.productComponent.create({
            data: {
              product_id: product.id,
              category: comp.category,
              name: comp.name,
              specification: comp.spec,
              unit_price: comp.price,
              sort_order: i,
            },
          });
        }

        // 创建报价说明与服务条款
        await prisma.productQuotationInfo.create({
          data: {
            product_id: product.id,
            price_notes: [
              '以上报价均为人民币含税价格',
              '价格包含产品主机及标准配件',
              '充电器可选配，详见各型号配置清单',
              '批量采购可享受优惠折扣',
              '海外版与国内版配置略有差异',
            ],
            features: [
              '开源飞控系统，支持二次开发',
              '模块化设计，便于维护和升级',
              '大载荷、长续航，高效作业',
              '智能控制，自主飞行精准喷洒',
              '多规格选择，满足不同作业需求',
            ],
            support: [
              '提供完整的技术文档和操作手册',
              '7×24小时技术支持热线',
              '定期软件更新和功能升级',
              '专业培训服务',
              '远程技术指导',
            ],
            service: [
              '整机质保12个月',
              '提供终身维修服务',
              '常用配件库存充足，快速发货',
              '可提供上门安装调试服务',
              '建立客户档案，定期回访',
            ],
            delivery: [
              '标准配置：3-5个工作日',
              '定制配置：7-15个工作日',
              '批量订单：根据实际情况商定',
              '紧急订单可加急处理',
              '海外发货需另行确认时间',
            ],
            payment: [
              '支持转账、支票等多种支付方式',
              '大额订单可分期付款',
              '详细付款条件请与销售部门协商',
              '支持对公转账开具发票',
              '接受第三方担保交易',
            ],
            validity_days: 30,
            validity_start_date: new Date(),
          },
        });

        console.log(`✅ 产品创建成功: ${product.name} (SKU: ${product.sku})`);
        successCount++;
      } catch (error: unknown) {
        const err = error as Error & { code?: string };
        console.error(`❌ 创建产品失败: ${productData.name}`);
        console.error(`   错误: ${err?.message || '未知错误'}`);
        if (err?.code === 'P2002') {
          console.log(`   产品已存在，跳过...`);
          skipCount++;
        }
      }
    }

    console.log('\n📊 导入结果统计:');
    console.log(`   ✅ 成功创建: ${successCount} 个产品`);
    console.log(`   ⏭️  跳过: ${skipCount} 个产品`);
    console.log(`   📦 总计: ${products.length} 个产品\n`);

    console.log('🎉 产品导入完成！');
    console.log(`\n访问商城查看产品: http://localhost:3000/zh-CN/shop/products`);
  } catch (error) {
    console.error('❌ 导入过程出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
