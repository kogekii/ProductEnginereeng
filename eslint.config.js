import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['dist/**', 'node_modules/**', '.opencode/**', 'coverage/**', 'test-results/**', 'playwright-report/**'],
});
