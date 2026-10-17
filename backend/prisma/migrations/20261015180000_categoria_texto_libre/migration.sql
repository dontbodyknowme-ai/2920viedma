-- Cambia "Wine"."category" de enum a texto libre.
--
-- ## Por que
--
-- Con `category WineCategory` ampliar las categorias era una migracion. El admin
-- no puede correr migraciones desde el panel, asi que "crear una categoria" no
-- existia como operacion: habia que editar el codigo y ademas migrar la base.
-- Con un String, la categoria se crea cargando un producto que la use.
--
-- ## Por que NO es lo que genera `prisma migrate diff`
--
-- Prisma propone:
--
--     ALTER TABLE "Wine" DROP COLUMN "category",
--     ADD COLUMN     "category" TEXT NOT NULL;
--
-- Eso **borra el catalogo**. No hace el cast porque un enum no se convierte solo:
-- necesita un `USING`, y Prisma no lo escribe. El resultado es un `ADD COLUMN
-- ... NOT NULL` sobre una tabla vacia, que en Postgres ademas falla si alguna fila
-- existiera.
--
-- Esta version convierte el tipo en el sitio. Los valores ya guardados sobreviven
-- como sus nombres ('Tinto', 'Blanco', 'Rosado', 'Espumante'), que es
-- exactamente el texto que quedaria.
--
-- ## Por que el indice se tira y se rehace
--
-- Postgres puede reconstruir solo el indice al cambiar el tipo de la columna,
-- pero aqui se rehace a mano para que el resultado sea el mismo que el que
-- espera Prisma y quede explicito en el archivo. Va antes del `ALTER` para que
-- la conversion no tenga que recompilarlo en mitad de la operacion.
--
-- `prisma migrate deploy` corre esto dentro de una transaccion: o entra todo o
-- no entra nada.

-- DropIndex
DROP INDEX IF EXISTS "Wine_category_idx";

-- AlterTable
ALTER TABLE "Wine" ALTER COLUMN "category" SET DATA TYPE TEXT USING "category"::text;

-- DropEnum
DROP TYPE IF EXISTS "WineCategory";

-- CreateIndex
CREATE INDEX "Wine_category_idx" ON "Wine"("category");
