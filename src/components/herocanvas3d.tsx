import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

function WineBottle3D() {
  const meshRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (!meshRef.current) return
    // Rotación suave guiada por la posición del mouse
    const targetX = (state.pointer.x * Math.PI) / 8
    const targetY = (state.pointer.y * Math.PI) / 12

    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetX, 0.05)
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -targetY, 0.05)
  })

  return (
    <group ref={meshRef} position={[0, -0.8, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        {/* Cuerpo de la Botella */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 2.2, 32]} />
          <meshPhysicalMaterial
            color='#1a050d'
            roughness={0.1}
            metalness={0.1}
            transmission={0.6}
            thickness={1.2}
            ior={1.5}
            clearcoat={1}
          />
        </mesh>

        {/* Cuello de la Botella */}
        <mesh position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.12, 0.22, 0.8, 32]} />
          <meshPhysicalMaterial
            color='#1a050d'
            roughness={0.1}
            metalness={0.1}
            transmission={0.6}
          />
        </mesh>

        {/* Etiqueta Dorado/Cream */}
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.455, 0.455, 1.1, 32, 1, true, -Math.PI / 3, (Math.PI * 2) / 3]} />
          <meshStandardMaterial
            color='#f4efe6'
            roughness={0.4}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Capuchón de la Cápula (Borgoña) */}
        <mesh position={[0, 2.95, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.3, 32]} />
          <meshStandardMaterial color='#5b132b' roughness={0.3} metalness={0.8} />
        </mesh>
      </Float>

      {/* Sombra proyectada */}
      <ContactShadows opacity={0.6} scale={4} blur={2.5} far={4} color='#800020' />
    </group>
  )
}

export const HeroCanvas3D = () => {
  return (
    <div className='w-full h-[400px] md:h-[550px] relative pointer-events-auto'>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} color='#e5c158' />
        <directionalLight position={[-5, -2, -2]} intensity={0.8} color='#800020' />
        
        <WineBottle3D />

        <Environment preset='city' />
      </Canvas>
    </div>
  )
}