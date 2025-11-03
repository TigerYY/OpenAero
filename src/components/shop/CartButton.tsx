'use client';

import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

import { CartDrawer } from './CartDrawer';
import { useCart } from './CartProvider';

interface CartButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CartButton({ variant = 'outline', size = 'sm', className }: CartButtonProps) {
  const { state } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        className={`relative ${className || ''}`}
        onClick={() => setIsOpen(true)}
      >
        <ShoppingCart className="h-4 w-4" />
        {state.totalItems > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {state.totalItems > 99 ? '99+' : state.totalItems}
          </Badge>
        )}
      </Button>
      
      <CartDrawer 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}