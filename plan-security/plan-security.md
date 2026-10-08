Plan de remediación — CAVA & CO.

Fase 1: Crítico/Deployment (antes de publicar)

1. Headers de seguridad en producción

- Configurar el servidor que sirva dist/ para incluir:
- Strict-Transport-Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content-Security-Policy
- Esfuerzo: 30 min (depende del servidor: Nginx, Vercel, Netlify, etc.)

1. Verificar que producción no use vite dev

- Asegurar que el build de producción use vite build + servidor estático
- Esfuerzo: 5 min

Fase 2: Código (fixes rápidos)

1. Validar imageUrl en el formulario de productos

- Aplicar esUrlHttpValida (ya existe en utils/validadores.ts) en editor_formador_productos.tsx
- Esfuerzo: 10 min

1. Reemplazar fallback de Math.random()

- Si crypto.randomUUID() no está disponible, usar un ID basado en timestamp + counter en vez de Math.random()
- Esfuerzo: 10 min

Fase 3: Mejoras (opcional)

1. Sanitizar datos de localStorage al leer

- Validar que los datos leídos de localStorage cumplan el contrato Wine antes de usarlos
- Esfuerzo: 30 min

1. Considerar encriptación de localStorage

- Si en el futuro se guardan datos sensibles, usar una librería como crypto-js
- Esfuerzo: 1 hora

Orden de ejecución sugerido

Fase 1.1 → Fase 1.2 → Fase 2.3 → Fase 2.4 → Fase 3.5 → Fase 3.6

Total estimado: ~1.5 horas para las Fases 1 y 2.