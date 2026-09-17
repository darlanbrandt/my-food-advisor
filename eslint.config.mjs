// Flat config do ESLint 9 (Next 16 removeu o `next lint`).
// Reusa o preset oficial next/core-web-vitals, que já é um flat config array
// (traz parser TypeScript + plugins next/react/react-hooks).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  // Desliga as regras do React Compiler (novas no eslint-plugin-react-hooks v6
  // que vem com o Next 16). O projeto usa React 18 sem o compiler, e esses
  // padrões (setState em effect para init/carga; memoização manual) são
  // intencionais e já existiam antes do upgrade.
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  // Ignora artefatos de build e dependências
  { ignores: ['.next/**', 'node_modules/**', 'public/**'] },
]

export default eslintConfig
