'use client';

import React, { useRef, useCallback, useEffect, ReactNode } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  startPoints: TouchPoint[];
  currentPoints: TouchPoint[];
  startDistance?: number;
  startAngle?: number;
  velocity: { x: number; y: number };
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface TouchGestureHandlerProps {
  children: ReactNode;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down', velocity: number) => void;
  onPinch?: (scale: number, center: { x: number; y: number }) => void;
  onRotate?: (angle: number, center: { x: number; y: number }) => void;
  onTap?: (point: { x: number; y: number }) => void;
  onDoubleTap?: (point: { x: number; y: number }) => void;
  onLongPress?: (point: { x: number; y: number }) => void;
  onPan?: (delta: { x: number; y: number }, velocity: { x: number; y: number }) => void;
  
  // 配置选项
  swipeThreshold?: number;
  pinchThreshold?: number;
  rotateThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  velocityThreshold?: number;
  
  // 样式和行为
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  children,
  onSwipe,
  onPinch,
  onRotate,
  onTap,
  onDoubleTap,
  onLongPress,
  onPan,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  rotateThreshold = 10,
  longPressDelay = 500,
  doubleTapDelay = 300,
  velocityThreshold = 0.5,
  className = '',
  style,
  disabled = false,
  preventDefault = true,
  stopPropagation = false
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const gestureStateRef = useRef<GestureState>({
    startPoints: [],
    currentPoints: [],
    velocity: { x: 0, y: 0 },
    direction: null
  });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPointRef = useRef<{ x: number; y: number } | null>(null);

  // 获取触摸点坐标
  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  }), []);

  // 获取两点间距离
  const getDistance = (point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 获取两点间角度
  const getAngle = (point1: TouchPoint, point2: TouchPoint): number => {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
  };

  // 获取多点中心
  const getCenter = (points: TouchPoint[]): { x: number; y: number } => {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  };

  // 计算速度
  const calculateVelocity = (start: TouchPoint, current: TouchPoint): { x: number; y: number } => {
    const timeDiff = current.timestamp - start.timestamp;
    if (timeDiff === 0) return { x: 0, y: 0 };
    
    return {
      x: (current.x - start.x) / timeDiff,
      y: (current.y - start.y) / timeDiff
    };
  };

  // 判断滑动方向
  const getSwipeDirection = (start: TouchPoint, end: TouchPoint): 'left' | 'right' | 'up' | 'down' | null => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < swipeThreshold) return null;

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  };

  // 清除长按定时器
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();

    const touches = Array.from(e.touches).map(getTouchPoint);
    gestureStateRef.current = {
      startPoints: touches,
      currentPoints: touches,
      velocity: { x: 0, y: 0 },
      direction: null
    };

    // 多点触摸时记录初始距离和角度
    if (touches.length === 2) {
      gestureStateRef.current.startDistance = getDistance(touches[0], touches[1]);
      gestureStateRef.current.startAngle = getAngle(touches[0], touches[1]);
    }

    // 单点触摸时设置长按定时器
    if (touches.length === 1 && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress(touches[0]);
      }, longPressDelay);
    }
  }, [disabled, preventDefault, stopPropagation, getTouchPoint, getDistance, getAngle, onLongPress, longPressDelay]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled) return;

    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();

    const touches = Array.from(e.touches).map(getTouchPoint);
    const { startPoints } = gestureStateRef.current;

    if (startPoints.length === 0) return;

    gestureStateRef.current.currentPoints = touches;

    // 清除长按定时器（因为手指移动了）
    clearLongPressTimer();

    // 单点触摸 - 处理滑动和拖拽
    if (touches.length === 1 && startPoints.length === 1 && touches[0] && startPoints[0]) {
      const start = startPoints[0];
      const current = touches[0];
      const velocity = calculateVelocity(start, current);
      
      gestureStateRef.current.velocity = velocity;
      gestureStateRef.current.direction = getSwipeDirection(start, current);

      // 触发拖拽事件
      if (onPan) {
        const delta = {
          x: current.x - start.x,
          y: current.y - start.y
        };
        onPan(delta, velocity);
      }
    }

    // 双点触摸 - 处理缩放和旋转
    if (touches.length === 2 && startPoints.length === 2 && touches[0] && touches[1]) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const currentAngle = getAngle(touches[0], touches[1]);
      const center = getCenter(touches);

      // 缩放手势
      if (onPinch && gestureStateRef.current.startDistance) {
        const scale = currentDistance / gestureStateRef.current.startDistance;
        if (Math.abs(scale - 1) > pinchThreshold) {
          onPinch(scale, center);
        }
      }

      // 旋转手势
      if (onRotate && gestureStateRef.current.startAngle !== undefined) {
        const angleDiff = currentAngle - gestureStateRef.current.startAngle;
        if (Math.abs(angleDiff) > rotateThreshold) {
          onRotate(angleDiff, center);
        }
      }
    }
  }, [disabled, preventDefault, stopPropagation, getTouchPoint, getDistance, getAngle, getCenter, calculateVelocity, getSwipeDirection, clearLongPressTimer, onPan, onPinch, onRotate, pinchThreshold, rotateThreshold]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled) return;

    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();

    const { startPoints, currentPoints, velocity, direction } = gestureStateRef.current;
    
    clearLongPressTimer();

    // 单点触摸结束
    if (startPoints.length === 1 && currentPoints.length === 1 && startPoints[0] && currentPoints[0]) {
      const start = startPoints[0];
      const end = currentPoints[0];
      const distance = getDistance(start, end);
      const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

      // 判断是否为滑动手势
      if (direction && distance >= swipeThreshold && velocityMagnitude >= velocityThreshold && onSwipe) {
        onSwipe(direction, velocityMagnitude);
      }
      // 判断是否为点击手势
      else if (distance < swipeThreshold && onTap) {
        const now = Date.now();
        const tapPoint = { x: end.x, y: end.y };

        // 检查双击
        if (onDoubleTap && lastTapTimeRef.current && 
            now - lastTapTimeRef.current < doubleTapDelay &&
            lastTapPointRef.current &&
            getDistance(
              { ...lastTapPointRef.current, timestamp: 0 }, 
              { ...tapPoint, timestamp: 0 }
            ) < 50) {
          onDoubleTap(tapPoint);
          lastTapTimeRef.current = 0; // 重置以避免三击
        } else {
          // 延迟触发单击，等待可能的双击
          setTimeout(() => {
            if (now === lastTapTimeRef.current) {
              onTap(tapPoint);
            }
          }, doubleTapDelay);
          
          lastTapTimeRef.current = now;
          lastTapPointRef.current = tapPoint;
        }
      }
    }

    // 重置手势状态
    gestureStateRef.current = {
      startPoints: [],
      currentPoints: [],
      velocity: { x: 0, y: 0 },
      direction: null
    };
  }, [disabled, preventDefault, stopPropagation, clearLongPressTimer, getDistance, swipeThreshold, velocityThreshold, onSwipe, onTap, onDoubleTap, doubleTapDelay]);

  // 绑定事件监听器
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return (
    <div
      ref={elementRef}
      className={`touch-gesture-handler ${className}`}
      style={{ touchAction: disabled ? 'auto' : 'none', ...style }}
    >
      {children}
    </div>
  );
};

export default TouchGestureHandler;