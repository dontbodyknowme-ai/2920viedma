-- spec 012: token publico del pedido, intentos de pago y auditoria de webhooks.

-- `publicToken` se agrega en tres pasos y no en uno.
--
-- `ADD COLUMN ... NOT NULL` sin default falla si la tabla tiene filas, y
-- `@default(uuid())` de Prisma es un default **del cliente**: la migracion no lo
-- crea en la base. O sea que las filas que ya existen se quedarian sin token y
-- `/pedido/:token` no las encontraria nunca.
ALTER TABLE "Order" ADD COLUMN "publicToken" TEXT;

UPDATE "Order"
SET "publicToken" = gen_random_uuid()::text
WHERE "publicToken" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");

-- Un pedido puede tener varios intentos (D5): link vencido, rechazo, cambio de
-- medio. `referenciaExterna` es el id del cobro en el proveedor y es unico
-- porque un cobro no puede pertenecer a dos pedidos.
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referenciaExterna" TEXT,
    "checkoutUrl" TEXT,
    "qrImagenUrl" TEXT,
    "qrPayload" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'no_iniciado',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_referenciaExterna_key" ON "PaymentAttempt"("referenciaExterna");
CREATE INDEX "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");
CREATE INDEX "PaymentAttempt_estado_createdAt_idx" ON "PaymentAttempt"("estado", "createdAt");

ALTER TABLE "PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Se guarda la notificacion **antes** de procesarla: si el procesamiento falla,
-- el evento queda con `processed = false` y la reconciliacion lo retoma.
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referencia" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEvent_referencia_idx" ON "WebhookEvent"("referencia");
CREATE INDEX "WebhookEvent_processed_receivedAt_idx" ON "WebhookEvent"("processed", "receivedAt");
