// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';

export default {
  input: 'src/typeahead.svelte',
  output: {
    sourcemap: false,
    format: 'esm',
    name: 'Typeahead',
    file: 'dist/typeahead_svelte.es6'
  },
  plugins: [
    svelte({
      dev: false,
    }),
    resolve(),
  ]
};
