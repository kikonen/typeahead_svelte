// rollup.config.js
import * as fs from 'fs';
import svelte from 'rollup-plugin-svelte';

export default {
  input: 'src/main.js',
  output: {
    file: 'public/bundle.js',
    format: 'iife'
  },
  plugins: [
    svelte({
      // By default, all .svelte and .html files are compiled
//      extensions: ['.my-custom-extension'],

      // You can restrict which files are compiled
      // using `include` and `exclude`
      include: 'src/components/**/*.svelte',

      // By default, the client-side compiler is used. You
      // can also use the server-side rendering compiler
      generate: 'ssr',

      // Optionally, preprocess components with svelte.preprocess:
      // https://svelte.dev/docs#svelte_preprocess
      preprocess: {
        style: ({ content }) => {
          return transformStyles(content);
        }
      },

      // Emit CSS as "files" for other plugins to process
      emitCss: true,

      // Extract CSS into a separate file (recommended).
      // See note below
      css: function (css) {
        console.log(css.code); // the concatenated CSS
        console.log(css.map); // a sourcemap

        // creates `main.css` and `main.css.map` — pass `false`
        // as the second argument if you don't want the sourcemap
        css.write('public/main.css');
      },

      // Warnings are normally passed straight to Rollup. You can
      // optionally handle them here, for example to squelch
      // warnings with a particular code
      onwarn: (warning, handler) => {
        // e.g. don't warn on <marquee> elements, cos they're cool
        if (warning.code === 'a11y-distracting-elements') return;

        // let Rollup handle all other warnings normally
        handler(warning);
      }
    })
  ]
}
