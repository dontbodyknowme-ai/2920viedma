import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { env } from '../src/config/env.js'

const prisma = new PrismaClient()

async function main() {
  const users = [
    {
      email: 'admin@vinoteca.local',
      password: 'admin123',
      name: 'Administrador',
      role: 'admin' as const
    },
    {
      email: 'gestor@vinoteca.local',
      password: 'admin123',
      name: 'Gestor',
      role: 'gestor' as const
    },
    {
      email: 'vendedor@vinoteca.local',
      password: 'admin123',
      name: 'Vendedor',
      role: 'vendedor' as const
    }
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: await bcrypt.hash(user.password, 10)
      }
    })
    console.log(`✓ Usuario creado/actualizado: ${user.email} (${user.role})`)
  }

  console.log('\nSeed completado. Credenciales de desarrollo:')
  console.log('  admin@vinoteca.local / admin123')
  console.log('  gestor@vinoteca.local / admin123')
  console.log('  vendedor@vinoteca.local / admin123')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })