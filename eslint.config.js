import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

// Este archivo ESM (no CommonJS) porque `package.json` declara "type": "module".
//
// En ESLint 9+ el sistema de configuracion plano (flat config) reemplazo al
// `.eslintrc`. Dos cambios del script `lint` se derivan de esto y NO son opcionales:
//   - `--ext ts,tsx` ya no se usa: los patrones de archivos se declaran aqui en `files`.
//   - `--report-unused-disable-directives` ya no es flag de CLI: se declara abajo en
//     `linterOptions.reportUnusedDisableDirectives`.
// `--max-warnings 0` sigue siendo un flag de CLI valido.

// Archivos lintables. Cubre `src/`, `test/` y los archivos de configuracion de la
// raiz (`vitest.config.ts`, `tailwind.config.js` y el futuro `vite.config.ts`).
const LINTABLE_FILES = [
  'src/**/*.{ts,tsx}',
  'test/**/*.{ts,tsx}',
  '*.ts',
  '*.js'
]

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      // Generado por `npx msw init`. No es codigo del proyecto: se regenera
      // con ese comando y no se edita a mano, asi que lintiarlo solo produce
      // ruido (hoy, un `eslint-disable` que MSW escribio para otra version).
      'public/mockServiceWorker.js'
    ]
  },

  {
    // Reemplaza el flag CLI `--report-unused-disable-directives`.
    // Un `eslint-disable` que no silencia nada se reporta como error.
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    }
  },

  {
    files: LINTABLE_FILES,
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended
    ],
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      // Convenciones de estilo exigidas por `AGENTS.md` y `docs/CONSTITUCION.md`:
      // comillas simples y sin puntos y comas.
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never']
    }
  }
)