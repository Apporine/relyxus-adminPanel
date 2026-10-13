// TS sources in apps/* use their package's own lint-staged config.
export default {
  "*.{js,mjs,cjs,json,md,yml,yaml,css}": "prettier --write",
};
