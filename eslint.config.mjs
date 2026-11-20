import { plugin, v8Plugin } from '@studnicky/eslint-config/node'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      // The @studnicky rules read types through the TypeScript program of tsconfig.json.
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    plugins: {
      '@studnicky': plugin,
      '@studnicky/v8': v8Plugin
    },
    rules: {
      '@studnicky/clean-diagnostics': 'error',
      '@studnicky/direct-invocation-only': 'error',
      '@studnicky/hash-private-fields': 'error',
      '@studnicky/lexical-this-only': 'error',
      '@studnicky/no-caller-chosen-guard-type': 'error',
      '@studnicky/no-circular-imports': 'error',
      '@studnicky/no-double-assertion': 'error',
      '@studnicky/no-mixed-callable-shapes': 'error',
      '@studnicky/no-redefined-external-types': 'error',
      '@studnicky/no-reflect-argument-laundering': 'error',
      '@studnicky/no-unchecked-overload-implementation': 'error',
      '@studnicky/no-unparsed-assertion': 'error',
      '@studnicky/v8/arguments-object': 'error',
      '@studnicky/v8/array-concat-outside-loops': 'error',
      '@studnicky/v8/array-from-iterators': 'error',
      '@studnicky/v8/array-splice-outside-loops': 'error',
      '@studnicky/v8/array-spread-outside-loops': 'error',
      '@studnicky/v8/computed-class-properties': 'error',
      '@studnicky/v8/conditional-property-assignment': 'error',
      '@studnicky/v8/define-property': 'error',
      '@studnicky/v8/eval-function': 'error',
      '@studnicky/v8/for-in-loops': 'error',
      '@studnicky/v8/inline-functions': 'error',
      '@studnicky/v8/max-switch-cases': 'error',
      '@studnicky/v8/memoize-array-length': 'error',
      '@studnicky/v8/object-spread': 'error',
      '@studnicky/v8/prototype-modification': 'error',
      '@studnicky/v8/switch-statements': 'error',
      '@studnicky/v8/with-statement': 'error'
    }
  }
]
