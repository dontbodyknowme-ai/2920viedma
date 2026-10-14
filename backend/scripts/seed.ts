/**
 * Crea los tres usuarios del panel: admin, gestor y vendedor.
 *
 * ## Las contrasenas NO estan en este archivo
 *
 * Este archivo esta commiteado. Una contrasena escrita aca queda en el repo en
 * texto plano **y en el historial de git para siempre**, aunque despues se
 * borre. Por eso se leen del entorno:
 *
 *   SEED_ADMIN_PASSWORD
 *   SEED_GESTOR_PASSWORD
 *   SEED_VENDEDOR_PASSWORD
 *
 * Es el mismo patron que ya usan `DATABASE_URL` y `JWT_SECRET`. Sin variables,
 * el seed usa una clave de desarrollo y **avisa**, porque re-seedear por error
 * contra una base real con la clave de desarrollo seria un agujero.
 *
 * `dotenv/config` se importa **a proposito**. Antes no hacia falta: el seed
 * corria con `node dist/scripts/seed.js` y `@prisma/client` cargaba el `.env`
 * de su cuenta al inicializarse, asi que las variables aparecian en
 * `process.env` por el camino largo. Ese accidente se rompe en el momento en
 * que el seed deja de usar Prisma o corre en otro orden, y las contrasenas
 * desaparecen sin avisar.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** Clave de desarrollo. Solo se usa si no hay variable de entorno. */
const CLAVE_DEV = 'admin123'

/**
 * Lee una contrasena del entorno y dice si cae en la de desarrollo.
 *
 * El `fallback` se devuelve **aparte** del valor para poder avisar. Devolver
 * solo el valor haria que un seed corriendo contra produccion con las variables
 * sin poner creara tres usuarios con `admin123` y no dira nada.
 */
const leerClave = (variable: string): { valor: string; esDev: boolean } => {
  const desdeEntorno = process.env[variable]?.trim()

  return desdeEntorno
    ? { valor: desdeEntorno, esDev: false }
    : { valor: CLAVE_DEV, esDev: true }
}

async function main() {
  // Nombres de persona, no el nombre del rol — con una excepcion.
  //
  // `Gestor` y `Vendedor` **son** el rol, y estan bien: el menu de usuario
  // muestra nombre, email y rol, y con "Gestor" dos veces se ve cual es cual
  // de un vistazo. Para eso `admin_header.tsx` no dibuja la etiqueta de rol
  // cuando coincide con el nombre.
  //
  // El admin si lleva nombre propio ("Manuel"), porque "Administrador"
  // no dice quien esta operando.
  const users = [
    {
      email: 'admin@vinoteca.local',
      clave: leerClave('SEED_ADMIN_PASSWORD'),
      name: 'Manuel',
      role: 'admin' as const
    },
    {
      email: 'gestor@vinoteca.local',
      clave: leerClave('SEED_GESTOR_PASSWORD'),
      name: 'Gestor',
      role: 'gestor' as const
    },
    {
      email: 'vendedor@vinoteca.local',
      clave: leerClave('SEED_VENDEDOR_PASSWORD'),
      name: 'Vendedor',
      role: 'vendedor' as const
    }
  ]

  const conClaveDev = users.filter((u) => u.clave.esDev)

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      // `name` y `role` si se actualizan: son datos de demostracion y el seed
      // es la fuente de verdad de ellos. `passwordHash` **no**: re-seedear no
      // puede resetear una contrasena que alguien haya cambiado, porque volver
      // a correr el seed no es una decision de cambiar credenciales.
      //
      // Para cambiar una contrasena hay que borrar el usuario (o cambiar el
      // hash a mano) de forma explicita.
      update: { name: user.name, role: user.role },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: await bcrypt.hash(user.clave.valor, 10)
      }
    })

    console.log(`✓ ${user.email} (${user.role})`)
  }

  if (conClaveDev.length > 0) {
    console.log(
      `\n⚠ ${conClaveDev.length} usuario(s) usan la clave de DESARROLLO (${CLAVE_DEV}):`
    )
    for (const u of conClaveDev) console.log(`    ${u.email}`)
    console.log(
      '  Si estas corriendo esto contra una base real, defines las variables\n' +
      '  SEED_*_PASSWORD antes de seedear.'
    )
  }

  console.log('\nSeed completado. No se imprimen las contrasenas.')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
