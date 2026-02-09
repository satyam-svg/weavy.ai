'use client';

import React from 'react';
import { useGLTF } from '@react-three/drei';

export function Model(props: React.JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/model/FinalBaseMesh.glb') as {
    nodes: Record<string, { geometry: unknown }>;
    materials: Record<string, unknown>;
  };

  const meshNode = nodes.g_Group1 ?? Object.values(nodes)[0];
  const material = materials['default'] ?? Object.values(materials)[0];

  if (!meshNode || !('geometry' in meshNode)) return null;

  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={meshNode.geometry as any}
        material={material as any}
      />
    </group>
  );
}

useGLTF.preload('/model/FinalBaseMesh.glb');
