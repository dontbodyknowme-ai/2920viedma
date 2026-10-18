-- La tienda deja de ser una vinateria y pasa a ser un kiosco: la taxonomia
-- tienen TRES niveles y `category` deja de ser el tipo de vino.
--
--   departamento  Bebidas | Regaleria | Gastronomia   (ya existe)
--   grupo         Con alcohol | Sin alcohol | Energizantes  (nuevo, nullable)
--   category      Vinos, Cerveza, Gaseosas, Jugos...  (dejo de ser Tinto/Blanco)
--   tipoVino      Tinto, Blanco, Rosado, Espumante    (nuevo, solo vinos)
--
-- Y `vintage`, `winery` y `varietal` pasan a nullables, porque una gaseosa no
-- tiene anada ni bodega ni cepa. Concederles un valor inventado seria meter
-- informacion falsa en la base.

-- `grupo` nullable: "Energizantes" cuelga directo de Bebidas porque no es ni con
-- alcohol ni sin alcohol. Si fuera NOT NULL, ese producto tendria que mentir con
-- el grupo o quedarse sin departamento.
ALTER TABLE "Wine" ADD COLUMN "grupo" TEXT;
ALTER TABLE "Wine" ADD COLUMN "tipoVino" TEXT;

-- Backfill del `tipoVino` ANTES de soltar el enum de `category`.
--
-- Sin esto, `category = 'Tinto'` se queda con `tipoVino` en NULL y esos 7 vinos
-- quedan sin color: el filtro "Vinos > Tinto" los pierde sin error. Los tres
-- `UPDATE` van en este orden y no en uno solo porque cada uno depende del que
-- acaba de correr: el grupo se deduce del `tipoVino` recien copiado, y la hoja
-- se reescribe solo para las filas que ya quedaron con tipo.
UPDATE "Wine" SET "tipoVino" = "category" WHERE "category" IN ('Tinto', 'Blanco', 'Rosado', 'Espumante');
UPDATE "Wine" SET "grupo" = 'Con alcohol' WHERE "tipoVino" IS NOT NULL;
UPDATE "Wine" SET "category" = 'Vinos' WHERE "tipoVino" IS NOT NULL;

-- Los tres pasan a nullable. `DROP NOT NULL` y nada mas: los valores quedan
-- como estan, y un vino cargado antes conserva su anada y su bodega.
ALTER TABLE "Wine" ALTER COLUMN "vintage" DROP NOT NULL;
ALTER TABLE "Wine" ALTER COLUMN "winery" DROP NOT NULL;
ALTER TABLE "Wine" ALTER COLUMN "varietal" DROP NOT NULL;

-- El indice de `grupo` va porque el filtro por grupo es el que se usa cuando se
-- esta adentro de un departamento, que es la navegacion normal del catalogo.
CREATE INDEX "Wine_grupo_idx" ON "Wine"("grupo");
