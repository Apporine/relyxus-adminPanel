export default {
  "*.{ts,tsx,mts}": ["eslint --max-warnings=0 --fix", "prettier --write"],
  "*.{js,mjs,cjs,json,md,css}": "prettier --write",
};
