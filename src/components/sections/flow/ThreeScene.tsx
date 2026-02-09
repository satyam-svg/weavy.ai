'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Stage, OrbitControls } from '@react-three/drei';
import { Model } from './Avatar';

export default function ThreeScene() {
  return (
    <div className="w-full h-full bg-[#f0f0f0] nodrag">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} color="red" intensity={2} />
        <pointLight position={[-5, 5, 5]} color="green" intensity={2} />
        <pointLight position={[0, -5, 5]} color="yellow" intensity={2} />
        <Stage intensity={0.3} environment="city" shadows={false} adjustCamera>
          <Model scale={1.8} />
        </Stage>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}
