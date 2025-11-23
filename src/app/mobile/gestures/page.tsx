'use client';

// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;


import React, { useState } from 'react';

import TouchGestureHandler from '@/components/TouchGestureHandler';

export default function GesturesPage() {
  const [gestureInfo, setGestureInfo] = useState<string>('等待手势...');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">触摸手势测试</h1>
        
        {/* 手势信息显示 */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">手势状态</h2>
          <p className="text-gray-600">{gestureInfo}</p>
          <div className="mt-2 text-sm text-gray-500">
            <p>缩放: {scale.toFixed(2)}</p>
            <p>旋转: {rotation.toFixed(1)}°</p>
            <p>位置: ({position.x.toFixed(0)}, {position.y.toFixed(0)})</p>
          </div>
        </div>

        {/* 手势测试区域 */}
        <TouchGestureHandler
          onSwipe={(direction, velocity) => {
            setGestureInfo(`滑动: ${direction}, 速度: ${velocity.toFixed(2)}`);
          }}
          onPinch={(newScale, center) => {
            setScale(newScale);
            setGestureInfo(`缩放: ${newScale.toFixed(2)} 中心: (${center.x.toFixed(0)}, ${center.y.toFixed(0)})`);
          }}
          onRotate={(angle, center) => {
            const degrees = (angle * 180) / Math.PI;
            setRotation(degrees);
            setGestureInfo(`旋转: ${degrees.toFixed(1)}° 中心: (${center.x.toFixed(0)}, ${center.y.toFixed(0)})`);
          }}
          onTap={(point) => {
            setGestureInfo(`点击: (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`);
          }}
          onDoubleTap={(point) => {
            setGestureInfo(`双击: (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`);
            // 重置变换
            setScale(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
          }}
          onLongPress={(point) => {
            setGestureInfo(`长按: (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`);
          }}
          onPan={(delta, velocity) => {
            setPosition(prev => ({
              x: prev.x + delta.x,
              y: prev.y + delta.y
            }));
            setGestureInfo(`拖拽: Δ(${delta.x.toFixed(0)}, ${delta.y.toFixed(0)}) 速度: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)})`);
          }}
          className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300"
          style={{ minHeight: '300px' }}
        >
          <div className="flex items-center justify-center h-full p-8">
            <div 
              className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-200"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`
              }}
            >
              🎯
            </div>
          </div>
        </TouchGestureHandler>

        {/* 使用说明 */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 单指滑动：触发滑动手势</li>
            <li>• 单指拖拽：移动蓝色圆圈</li>
            <li>• 双指捏合：缩放圆圈</li>
            <li>• 双指旋转：旋转圆圈</li>
            <li>• 单击：显示点击位置</li>
            <li>• 双击：重置所有变换</li>
            <li>• 长按：显示长按位置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}