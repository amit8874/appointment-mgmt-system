import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const BurstEffect = ({ onComplete }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Particle system
    const particleCount = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 2; // random start position
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.05,
      transparent: true,
      opacity: 1,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let frame = 0;
    function animate() {
      frame++;
      const positions = geometry.attributes.position.array;
      for (let i = 0; i < particleCount * 3; i++) {
        positions[i] *= 1.05; // expand outward (burst)
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = Math.max(0, 1 - frame / 60); // fade out
      renderer.render(scene, camera);

      if (frame < 60) {
        requestAnimationFrame(animate);
      } else {
        // Clean up and trigger callback
        if (onComplete) onComplete();
        mountRef.current.removeChild(renderer.domElement);
      }
    }

    animate();

    return () => {
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [onComplete]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-[9999] flex items-center justify-center bg-transparent"
    ></div>
  );
};

export default BurstEffect;
