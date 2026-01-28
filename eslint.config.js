import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "warn"
        },
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        ignores: ["dist/**", "node_modules/**", "vite.config.ts", "eslint.config.js"]
    }
);
