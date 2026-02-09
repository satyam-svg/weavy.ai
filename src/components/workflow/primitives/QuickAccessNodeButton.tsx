'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { QuickAccessNodeButtonProps } from '../types';

/**
 * QuickAccessNodeButton Component
 * 
 * A draggable button for adding nodes to the workflow canvas.
 * Supports both click-to-add and drag-to-drop functionality.
 */
export function QuickAccessNodeButton({
  title,
  icon,
  nodeType,
  onAdd,
}: QuickAccessNodeButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(nodeType)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/reactflow', nodeType);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-white/20',
        'bg-[#262626] text-white hover:bg-[#333] hover:border-white/30',
        'transition-all cursor-grab active:cursor-grabbing'
      )}
    >
      <span className="text-white">{icon}</span>
      <span className="text-[13px] font-medium text-white">{title}</span>
    </button>
  );
}
