'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CloudOverlayProps {
  visible: boolean;
}

// Procedural cloud texture — overlapping radial blobs for organic shape
function createCloudTexture(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const blobs = [
    { x: 0.5, y: 0.5, r: 0.42, a: 0.45 },
    { x: 0.35, y: 0.42, r: 0.26, a: 0.4 },
    { x: 0.68, y: 0.55, r: 0.30, a: 0.42 },
    { x: 0.42, y: 0.62, r: 0.22, a: 0.35 },
    { x: 0.62, y: 0.38, r: 0.24, a: 0.38 },
    { x: 0.55, y: 0.48, r: 0.20, a: 0.30 },
  ];

  for (const b of blobs) {
    const g = ctx.createRadialGradient(
      b.x * size, b.y * size, 0,
      b.x * size, b.y * size, b.r * size,
    );
    g.addColorStop(0, `rgba(255,255,255,${b.a})`);
    g.addColorStop(0.5, `rgba(255,255,255,${b.a * 0.35})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  return canvas;
}

interface Cloud {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  depth: number; // 0.2 = far (slow parallax), 1.0 = near (fast parallax)
  driftSpeed: number;
}

export default function CloudOverlay({ visible }: CloudOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 1000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Texture
    const texture = new THREE.CanvasTexture(createCloudTexture());

    // Create clouds
    const clouds: Cloud[] = [];
    const geo = new THREE.PlaneGeometry(1, 1);

    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0.08 + Math.random() * 0.18,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const scale = 200 + Math.random() * 500;
      mesh.scale.set(scale, scale * (0.35 + Math.random() * 0.25), 1);

      const baseX = (Math.random() - 0.5) * W * 2;
      const baseY = (Math.random() - 0.5) * H * 2;
      const depth = 0.2 + Math.random() * 0.8;

      mesh.position.set(baseX, baseY, -10 - i * 2);

      scene.add(mesh);
      clouds.push({
        mesh,
        baseX,
        baseY,
        depth,
        driftSpeed: 0.08 + Math.random() * 0.25,
      });
    }

    // Mouse listener
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / W - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / H - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Animation
    let frame: number;
    const animate = () => {
      frame = requestAnimationFrame(animate);

      // Smooth mouse interpolation
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.04;
      m.y += (m.targetY - m.y) * 0.04;

      for (const c of clouds) {
        // Slow wind drift
        c.baseX += c.driftSpeed;
        if (c.baseX > W * 1.2) c.baseX = -W * 1.2;

        // Parallax from cursor — near clouds move more
        c.mesh.position.x = c.baseX + m.x * 60 * c.depth;
        c.mesh.position.y = c.baseY - m.y * 40 * c.depth;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      texture.dispose();
      geo.dispose();
      clouds.forEach(c => (c.mesh.material as THREE.MeshBasicMaterial).dispose());
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ zIndex: 12, opacity: visible ? 1 : 0 }}
    />
  );
}
