'use client';

import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  X,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useRouting } from '@/lib/routing';

import { useCart } from './CartProvider';

interface CartDrawerProps {
  children?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ children, isOpen, onClose }: CartDrawerProps) {
  const { state, updateQuantity, removeItem, clearCart } = useCart();
  const { route, routes } = useRouting();

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = () => {
    onClose();
    // TODO: 跳转到结算页面
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 侧边栏 */}
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-lg bg-white z-50 shadow-xl">
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <h2 className="text-lg font-semibold">购物车 ({state.totalItems})</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 px-4 py-2 border-b">
            {state.items.length > 0 ? '管理您的购物车商品' : '您的购物车是空的'}
          </div>

          {state.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">购物车是空的</h3>
              <p className="text-gray-500 mb-6">快去挑选您喜欢的商品吧！</p>
              <Button asChild onClick={onClose}>
                <Link href={route(routes.BUSINESS.SHOP)}>
                  去购物
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* 购物车商品列表 */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-4 px-4">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Link 
                              href={route(`/shop/products/${item.slug}`)}
                              className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                              onClick={onClose}
                            >
                              {item.name}
                            </Link>
                            <div className="text-sm text-gray-500 mt-1">
                              {item.brand && <span>品牌: {item.brand}</span>}
                              {item.color && <span className="ml-2">颜色: {item.color}</span>}
                              {item.size && <span className="ml-2">尺寸: {item.size}</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.maxQuantity}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-medium text-red-600">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <div className="text-xs text-gray-500 line-through">
                                {formatCurrency(item.originalPrice * item.quantity)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 购物车底部 */}
              <div className="border-t p-4 space-y-4">
                {/* 总计 */}
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>总计:</span>
                  <span className="text-red-600">{formatCurrency(state.totalPrice)}</span>
                </div>

                {/* 操作按钮 */}
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={handleCheckout}
                    disabled={state.items.length === 0}
                  >
                    去结算 ({state.totalItems})
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      asChild
                      onClick={onClose}
                    >
                      <Link href={route(routes.BUSINESS.SHOP)}>继续购物</Link>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={clearCart}
                      disabled={state.items.length === 0}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 提示信息 */}
                <div className="text-xs text-gray-500 text-center">
                  <p>满99元免运费 • 7天无理由退换</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}