-- La tienda dejo de ser una vinateria: `Wine` pasa a `Product` y la columna
-- `OrderItem.wineId` a `OrderItem.productoId`.
--
-- Son **solo nombres**. `ALTER TABLE ... RENAME TO` y `... RENAME COLUMN` son
-- operaciones de catalogo: no copian filas, no reescriben datos y no bloquean la
-- tabla mas alla del instante del rename.
--
-- **Va en una migracion nueva y no se edita ninguna vieja.** Las migraciones ya
-- aplicadas son el registro historico de lo que se le hizo a la base: si se les
-- cambia el nombre de la tabla que mencionan, el historial deja de coincidir con
-- lo que la base tiene. Por eso esta corre *despues* de
-- `20261017200000_taxonomia_kiosco`, que todavia habla de `"Wine"`.
--
-- El orden importa: primero la tabla, despues la columna. La columna tiene
-- ademas una FK a `"Wine"`, asi que renombrar la columna antes que la tabla
-- dejaria la FK apuntando a un nombre que ya no existe.
ALTER TABLE "Wine" RENAME TO "Product";

-- Sin esto, Prisma genera una columna `productoId` **nueva y vacia** y los
-- pedidos ya guardados quedan con la referencia en `NULL`: no da error de
-- schema, da un historial de pedidos con productos faltantes.
ALTER TABLE "OrderItem" RENAME COLUMN "wineId" TO "productoId";

-- El indice se creo con el nombre viejo. `RENAME COLUMN` no lo renombra —el
-- nombre del indice es independiente del de la columna—, asi que sin esto queda
-- un indice que ya no corresponde a nada y `prisma migrate diff` lo quiere
-- volver a crear sobre una columna que existe.
ALTER INDEX "OrderItem_wineId_idx" RENAME TO "OrderItem_productoId_idx";
