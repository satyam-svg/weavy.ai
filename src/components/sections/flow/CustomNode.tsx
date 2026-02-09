'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

type CustomNodeData = {
  label?: string;
  type?: string;
  width: number;
  height: number;
  borderRadius?: string;
  content: React.ReactNode;
};

export default function CustomNode({ data }: NodeProps<CustomNodeData>) {
  const { label, type, width, height, borderRadius = '12px', content } = data;

  return (
    <div className="custom-node">
      {(label || type) && (
        <div className="flex items-center gap-2 mb-1.5 px-0.5">
          {type && (
            <span className="text-[10px] font-bold tracking-[0.15em] text-black/40 uppercase">
              {type}
            </span>
          )}
          {label && (
            <span className="text-[10px] font-bold tracking-[0.15em] text-black uppercase">
              {label}
            </span>
          )}
        </div>
      )}
      <div
        className="rounded-lg overflow-hidden bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/5"
        style={{
          width,
          height,
          borderRadius,
        }}
      >
        <div className="w-full h-full min-h-0">{content}</div>
        <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2" />
        <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2" />
      </div>
    </div>
  );
}
