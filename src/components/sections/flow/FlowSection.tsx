'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from './CustomNode';
import ThreeScene from './ThreeScene';

const nodeTypes = { custom: CustomNode };

const initialEdges = [
  { id: 'e1-3', source: '1', target: '3', style: { stroke: '#D1D1D1', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: '#D1D1D1', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', style: { stroke: '#D1D1D1', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', style: { stroke: '#D1D1D1', strokeWidth: 2 } },
  { id: 'e4-6', source: '4', target: '6', style: { stroke: '#D1D1D1', strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', style: { stroke: '#D1D1D1', strokeWidth: 2 } },
];

export default function FlowSection() {
  const initialNodes = useMemo(
    () => [
      {
        id: '1',
        type: 'custom',
        position: { x: 0, y: 100 },
        data: {
          type: '3D',
          label: 'RODIN 2.0',
          width: 180,
          height: 220,
          content: <ThreeScene />,
        },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 0, y: 400 },
        data: {
          label: 'COLOR REFERENCE',
          width: 250,
          height: 140,
          content: (
            <div className="w-full h-full relative">
              <img
                src="/assets/color.jpg"
                alt="Color Reference"
                className="w-full h-full object-cover"
              />
            </div>
          ),
        },
      },
      {
        id: '3',
        type: 'custom',
        position: { x: 320, y: 0 },
        data: {
          type: 'IMAGE',
          label: 'STABLE DIFFUSION',
          width: 320,
          height: 500,
          content: (
            <div className="w-full h-full relative">
              <img src="/assets/man.png" alt="Man" className="w-full h-full object-cover" />
            </div>
          ),
        },
      },
      {
        id: '4',
        type: 'custom',
        position: { x: 700, y: 0 },
        data: {
          type: 'TEXT',
          width: 210,
          height: 110,
          borderRadius: '16px',
          content: (
            <div className="p-3 text-[11px] text-gray-500 leading-relaxed">
              a Great-Tailed Grackle bird is flying from the background and seating on the
              model&apos;s shoulder slowly and barely moves. the model looks at the camera. then
              bird flies away. cinematic.
            </div>
          ),
        },
      },
      {
        id: '5',
        type: 'custom',
        position: { x: 700, y: 280 },
        data: {
          type: 'IMAGE',
          label: 'FLUX PRO 1.1',
          width: 180,
          height: 220,
          content: (
            <div className="w-full h-full relative">
              <img src="/assets/crow.png" alt="Crow" className="w-full h-full object-cover" />
            </div>
          ),
        },
      },
      {
        id: '6',
        type: 'custom',
        position: { x: 950, y: 100 },
        data: {
          type: 'VIDEO',
          label: 'MINIMAX VIDEO',
          width: 320,
          height: 500,
          content: (
            <div className="w-full h-full relative">
              <video
                src="/assets/video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ),
        },
      },
    ],
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: { stroke: '#D1D1D1', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div className="w-full h-[650px] -mt-10 mb-20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        nodesDraggable
        panOnDrag
      />
    </div>
  );
}
