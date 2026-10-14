import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Nombres de persona, no el nombre del rol.
  //
  // Con `name: 'Administrador'` el panel no podia distinguir "quien estas
  // conectado" de "que rol tenes": el menu de usuario muestra ambos y decia
  // "Administrador" dos veces, en dos lugares distintos. Con nombre real el
  // menu dice **Ana Ruiz · admin@vinoteca.local · Administradora**, y se lee
  // de un vistazo que son tres datos y no dos.
  const users = [
    {
      email: 'admin@vinoteca.local',
      password: 'admin123',
      name: 'Ana Ruiz',
      role: 'admin' as const
    },
    {
      email: 'gestor@vinoteca.local',
      password: 'admin123',
      name: 'Bruno Diaz',
      role: 'gestor' as const
    },
    {
      email: 'vendedor@vinoteca.local',
      password: 'admin123',
      name: 'Carla Suarez',
      role: 'vendedor' as const
    }
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      // `name` y `role` si se actualizan: son datos de demostracion y el seed
      // es la fuente de verdad de ellos. `passwordHash` **no**: re-seedear no
      // puede resetear una contrasena que alguien haya cambiado.
      update: { name: user.name, role: user.role },
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