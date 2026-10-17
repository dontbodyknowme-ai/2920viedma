-- El departamento es el eje con el que el panel separa el stock.
--
-- `NOT NULL DEFAULT 'Bebidas'`: la columna no puede ser nulable porque el filtro
-- del panel la compara con `where.departamento = <pestaña>` y un `NULL` no
-- matchea ninguna, o sea que los productos sin departamento desaparecerian de
-- todas las pestañas en vez de aparecer en "sin departamento".
--
-- El default es 'Bebidas' y no un valor inventado por fila porque **todo lo que
-- hay hoy son vinos**. Las filas existentes son todas bebidas, asi que el
-- default dice la verdad. Las otras tres pestañas arrancan vacias, que es la
-- informacion correcta: no hay regaleria ni comidas cargadas todavia.
ALTER TABLE "Wine" ADD COLUMN "departamento" TEXT NOT NULL DEFAULT 'Bebidas';

-- El indice va porque el filtro por departamento es la consulta mas frecuente
-- del panel ahora: es la que hace la tabla entera de cada pestaña.
CREATE INDEX "Wine_departamento_idx" ON "Wine"("departamento");
