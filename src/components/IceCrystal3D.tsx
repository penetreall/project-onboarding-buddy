import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function IceCrystal3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    const crystalGeometry = new THREE.IcosahedronGeometry(0.9, 1);
    const vertices = crystalGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] *= 1 + Math.random() * 0.3;
      vertices[i + 1] *= 1 + Math.random() * 0.4;
      vertices[i + 2] *= 1 + Math.random() * 0.3;
    }
    crystalGeometry.attributes.position.needsUpdate = true;
    crystalGeometry.computeVertexNormals();

    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x26b1f0,
      metalness: 0.05,
      roughness: 0.15,
      transparent: true,
      opacity: 0.35,
      transmission: 0.95,
      thickness: 0.8,
      ior: 1.5,
      reflectivity: 0.9,
      envMapIntensity: 2.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
    });

    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    scene.add(crystal);

    const edgesGeometry = new THREE.EdgesGeometry(crystalGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x26b1f0,
      transparent: true,
      opacity: 0.12,
      linewidth: 1,
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    crystal.add(edges);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const keyLight = new THREE.SpotLight(0xffffff, 3);
    keyLight.position.set(3, 4, 4);
    keyLight.angle = Math.PI / 6;
    keyLight.penumbra = 0.3;
    keyLight.decay = 2;
    keyLight.distance = 15;
    scene.add(keyLight);

    const pointLight1 = new THREE.PointLight(0x26b1f0, 1.5, 10);
    pointLight1.position.set(2, 3, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0d5a7a, 0.8, 10);
    pointLight2.position.set(-2, -2, 1);
    scene.add(pointLight2);

    const rimLight = new THREE.DirectionalLight(0xa0d8f0, 0.6);
    rimLight.position.set(-1, -1, -2);
    scene.add(rimLight);

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.008;

      crystal.rotation.x = time * 0.02 + mouseRef.current.y * 0.08;
      crystal.rotation.y = time * 0.035 + mouseRef.current.x * 0.08;
      crystal.rotation.z = time * 0.015;

      crystal.position.y = Math.sin(time * 0.4) * 0.12;

      pointLight1.position.x = Math.sin(time * 0.2) * 1.5 + 2;
      pointLight1.position.z = Math.cos(time * 0.2) * 1.5 + 3;

      renderer.render(scene, camera);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;

      mouseRef.current.x += (x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (y - mouseRef.current.y) * 0.05;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      crystalGeometry.dispose();
      crystalMaterial.dispose();
      edgesGeometry.dispose();
      edgesMaterial.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '4%',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '280px',
        height: '280px',
        pointerEvents: 'none',
        opacity: 0.85,
        filter: 'drop-shadow(0 0 60px rgba(38, 177, 240, 0.15)) drop-shadow(0 0 30px rgba(38, 177, 240, 0.1))',
      }}
    />
  );
}
