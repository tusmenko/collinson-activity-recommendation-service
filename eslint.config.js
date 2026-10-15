import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import n from 'eslint-plugin-n';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

// Type declarations, exported or not, live only in *.types.ts and *.schema.ts (coding standards, file layout).
const TYPE_PLACEMENT = [
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
].map((selector) => ({
  selector,
  message: 'Types belong in a *.types.ts or *.schema.ts file.',
}));

// Files holding one Nest, BullMQ or GraphQL class carry no module-level functions (coding standards, file layout).
const CLASS_FILES = [
  'service',
  'adapter',
  'repository',
  'resolver',
  'processor',
  'classifier',
  'queue',
  'controller',
  'guard',
  'filter',
  'mapper',
  'plugin',
  'pipe',
  'indicator',
].map((postfix) => `src/**/*.${postfix}.ts`);

const HELPER_PLACEMENT = [
  'Program > FunctionDeclaration',
  'Program > ExportNamedDeclaration > FunctionDeclaration',
  'Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
  'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
].map((selector) => ({ selector, message: 'helpers go to *.util.ts or a private method' }));

// Every file under src/ is named by a postfix from the layout table; index.ts and main.ts are the exceptions.
const POSTFIXES = [
  'module',
  'service',
  'resolver',
  'controller',
  'adapter',
  'repository',
  'port',
  'types',
  'const',
  'schema',
  'errors',
  'util',
  'classifier',
  'queue',
  'processor',
  'guard',
  'filter',
  'mapper',
  'plugin',
  'pipe',
  'indicator',
  'model',
  'fixture',
  'spec',
].join('|');

const NO_EXPORT_ALL = {
  selector: 'ExportAllDeclaration',
  message: 'Barrels list their exports by name; export * is not allowed.',
};

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', '.claude/'] },
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
      'check-file/filename-blocklist': [
        'error',
        { [`src/**/!(index|main|*.@(${POSTFIXES})).ts`]: `*.@(${POSTFIXES}).ts` },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.types.ts', 'src/**/*.schema.ts', 'src/**/*.spec.ts'],
    rules: { 'no-restricted-syntax': ['error', NO_EXPORT_ALL, ...TYPE_PLACEMENT] },
  },
  {
    files: CLASS_FILES,
    rules: {
      'no-restricted-syntax': ['error', NO_EXPORT_ALL, ...TYPE_PLACEMENT, ...HELPER_PLACEMENT],
    },
  },
  {
    // The layout table gives these postfixes plural contents: a module's error classes, a port's DI tokens.
    files: ['src/**/*.errors.ts', 'src/**/*.port.ts'],
    rules: { 'max-classes-per-file': 'off' },
  },
  {
    files: ['src/infra/config/**/*.ts', 'test/setup/**/*.ts', 'test/stub-upstream/**/*.ts'],
    rules: { 'n/no-process-env': 'off' },
  },
  {
    files: ['src/**/*.spec.ts', 'test/**/*.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // Command-line scripts outside the app: they print, read their own environment and run on Node's web globals.
    files: ['scripts/**'],
    languageOptions: {
      globals: { URL: 'readonly', fetch: 'readonly', performance: 'readonly' },
    },
    rules: { 'no-console': 'off', 'n/no-process-env': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', module: 'writable' } },
  },
  prettier,
);
