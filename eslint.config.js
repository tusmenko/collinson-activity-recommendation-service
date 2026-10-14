import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import n from 'eslint-plugin-n';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

// Exported type declarations live only in *.types.ts and *.schema.ts (coding standards, file layout).
const TYPE_PLACEMENT = [
  'ExportNamedDeclaration > TSInterfaceDeclaration',
  'ExportNamedDeclaration > TSTypeAliasDeclaration',
  'ExportNamedDeclaration > TSEnumDeclaration',
].map((selector) => ({
  selector,
  message: 'Exported types belong in a *.types.ts or *.schema.ts file.',
}));

const NO_EXPORT_ALL = {
  selector: 'ExportAllDeclaration',
  message: 'Barrels list their exports by name; export * is not allowed.',
};

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'check-file': checkFile, n, sonarjs },
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-classes-per-file': ['error', 1],
      'sonarjs/cognitive-complexity': ['error', 15],
      'no-console': 'error',
      'n/no-process-env': 'error',
      'no-restricted-syntax': ['error', NO_EXPORT_ALL],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Nest modules are empty classes carrying a decorator.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,js,mjs,cjs}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { '{src,test,scripts}/**/': 'KEBAB_CASE' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.types.ts', 'src/**/*.schema.ts', 'src/**/*.spec.ts'],
    rules: { 'no-restricted-syntax': ['error', NO_EXPORT_ALL, ...TYPE_PLACEMENT] },
  },
  {
    files: ['src/infra/config/**/*.ts', 'test/setup/**/*.ts'],
    rules: { 'n/no-process-env': 'off' },
  },
  {
    files: ['src/**/*.spec.ts', 'test/**/*.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', module: 'writable' } },
  },
  prettier,
);
