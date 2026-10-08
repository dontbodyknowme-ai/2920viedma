import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

const PALETA = {
  vino900: '#3a0a1a',
  vino700: '#5b132b',
  vino500: '#800020',
  oro400: '#e5c158',
  oro500: '#d4af37',
  oro600: '#aa8c2c',
  crema100: '#fdfbf7',
  crema200: '#f4efe6'
} as const

const perfil = (puntos: readonly (readonly [number, number])[]) =>
  puntos.map(([radio, altura]) => new THREE.Vector2(radio, altura))

const PERFIL_VIDRIO = perfil([
  [0.001, 0.0],
  [0.34, 0.0],
  [0.45, 0.05],
  [0.485, 0.16],
  [0.495, 0.42],
  [0.5, 1.05],
  [0.495, 1.72],
  [0.47, 1.98],
  [0.38, 2.16],
  [0.24, 2.3],
  [0.155, 2.4],
  [0.128, 2.52],
  [0.118, 2.78],
  [0.116, 3.02],
  [0.132, 3.1],
  [0.148, 3.14],
  [0.128, 3.18],
  [0.108, 3.2]
])

const PERFIL_VINO = perfil([
  [0.001, 0.14],
  [0.4, 0.14],
  [0.44, 0.28],
  [0.445, 1.58],
  [0.42, 1.78],
  [0.001, 1.78]
])

const PERFIL_PUNTILLA = perfil([
  [0.001, 0.02],
  [0.2, 0.28],
  [0.32, 0.08],
  [0.001, 0.08]
])

const crearTexturaEtiqueta = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.fillStyle = PALETA.crema200
    ctx.fillRect(0, 0, 1024, 1024)

    ctx.strokeStyle = PALETA.oro500
    ctx.lineWidth = 28
    ctx.strokeRect(40, 40, 944, 944)

    ctx.strokeStyle = PALETA.oro600
    ctx.lineWidth = 3
    ctx.strokeRect(72, 72, 880, 880)

    ctx.fillStyle = PALETA.vino700
    ctx.textAlign = 'center'
    ctx.font = '600 54px Georgia, "Times New Roman", serif'
    ctx.fillText('CAVA & CO.', 512, 250)

    ctx.fillStyle = PALETA.oro500
    ctx.font = '500 26px system-ui, sans-serif'
    ctx.fillText('ESTATE  ·  RESERVE', 512, 320)

    ctx.beginPath()
    ctx.moveTo(260, 380)
    ctx.lineTo(764, 380)
    ctx.strokeStyle = PALETA.oro500
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = PALETA.vino900
    ctx.font = 'italic 92px Georgia, "Times New Roman", serif'
    ctx.fillText('Malbec', 512, 540)

    ctx.fillStyle = PALETA.vino700
    ctx.font = '500 56px Georgia, "Times New Roman", serif'
    ctx.fillText('2019', 512, 640)

    ctx.beginPath()
    ctx.arc(512, 760, 54, 0, Math.PI * 2)
    ctx.strokeStyle = PALETA.oro500
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.fillStyle = PALETA.oro600
    ctx.font = '600 22px Georgia, "Times New Roman", serif'
    ctx.fillText('C&C', 512, 768)

    ctx.fillStyle = PALETA.oro600
    ctx.font = '500 22px system-ui, sans-serif'
    ctx.fillText('MENDOZA  ·  ARGENTINA', 512, 900)
  }

  const textura = new THREE.CanvasTexture(canvas)
  textura.anisotropy = 8
  textura.colorSpace = THREE.SRGBColorSpace
  textura.needsUpdate = true
  return textura
}

function WineBottle3D() {
  const meshRef = useRef<THREE.Group>(null!)
  const texturaEtiqueta = useMemo(() => crearTexturaEtiqueta(), [])

  useEffect(() => () => texturaEtiqueta.dispose(), [texturaEtiqueta])

  useFrame((state) => {
    if (!meshRef.current) return
    const targetX = (state.pointer.x * Math.PI) / 10
    const targetY = (state.pointer.y * Math.PI) / 14

    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetX, 0.05)
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -targetY, 0.05)
  })

  return (
    <group ref={meshRef} position={[0, -1.45, 0]}>
      <Float speed={1.15} rotationIntensity={0.08} floatIntensity={0.22}>
        <mesh>
          <latheGeometry args={[PERFIL_VINO, 64]} />
          <meshPhysicalMaterial
            color={PALETA.vino700}
            roughness={0.28}
            metalness={0.05}
            clearcoat={0.35}
            envMapIntensity={0.6}
          />
        </mesh>

        <mesh>
          <latheGeometry args={[PERFIL_VIDRIO, 96]} />
          <meshPhysicalMaterial
            color={PALETA.vino900}
            roughness={0.06}
            metalness={0.05}
            transmission={0.62}
            thickness={0.85}
            ior={1.5}
            clearcoat={1}
            clearcoatRoughness={0.06}
            attenuationColor={PALETA.vino500}
            attenuationDistance={0.55}
            transparent
            envMapIntensity={1.35}
          />
        </mesh>

        <mesh>
          <latheGeometry args={[PERFIL_PUNTILLA, 48]} />
          <meshPhysicalMaterial
            color={PALETA.vino900}
            roughness={0.12}
            metalness={0.08}
            transmission={0.25}
            thickness={0.4}
            transparent
          />
        </mesh>

        <mesh position={[0, 1.12, 0]} rotation={[0, Math.PI / 10, 0]}>
          <cylinderGeometry args={[0.504, 0.504, 1.18, 64, 1, true, -1.05, 2.1]} />
          <meshStandardMaterial
            map={texturaEtiqueta}
            roughness={0.55}
            metalness={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 1.72, 0]} rotation={[0, Math.PI / 10, 0]}>
          <cylinderGeometry args={[0.506, 0.506, 0.045, 64, 1, true, -1.05, 2.1]} />
          <meshStandardMaterial color={PALETA.oro500} roughness={0.25} metalness={0.85} />
        </mesh>

        <mesh position={[0, 0.52, 0]} rotation={[0, Math.PI / 10, 0]}>
          <cylinderGeometry args={[0.506, 0.506, 0.045, 64, 1, true, -1.05, 2.1]} />
          <meshStandardMaterial color={PALETA.oro500} roughness={0.25} metalness={0.85} />
        </mesh>

        <mesh position={[0, 2.96, 0]}>
          <cylinderGeometry args={[0.138, 0.132, 0.5, 48]} />
          <meshStandardMaterial
            color={PALETA.oro500}
            roughness={0.22}
            metalness={0.92}
            envMapIntensity={1.4}
          />
        </mesh>

        <mesh position={[0, 2.71, 0]}>
          <torusGeometry args={[0.134, 0.012, 12, 48]} />
          <meshStandardMaterial color={PALETA.vino700} roughness={0.35} metalness={0.6} />
        </mesh>

        <mesh position={[0, 3.21, 0]}>
          <cylinderGeometry args={[0.128, 0.138, 0.06, 48]} />
          <meshStandardMaterial color={PALETA.oro400} roughness={0.18} metalness={0.95} />
        </mesh>

        <mesh position={[0, 3.175, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
          <meshStandardMaterial color={PALETA.crema100} roughness={0.7} metalness={0} />
        </mesh>
      </Float>

      <ContactShadows opacity={0.55} scale={5} blur={2.8} far={4.5} color={PALETA.vino500} />
    </group>
  )
}

export const HeroCanvas3D = () => {
  return (
    <div className='w-full h-[400px] md:h-[550px] relative pointer-events-auto'>
      <Canvas
        camera={{ position: [0, 0.35, 6.1], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.28} />
        <directionalLight position={[4.5, 7, 5]} intensity={1.55} color={PALETA.oro400} />
        <directionalLight position={[-5, 1.5, -3]} intensity={0.7} color={PALETA.vino500} />
        <spotLight
          position={[0, 6, 2]}
          angle={0.35}
          penumbra={0.8}
          intensity={1.1}
          color={PALETA.crema100}
        />

        <WineBottle3D />

        <Environment preset='studio' />
      </Canvas>
    </div>
  )
}
