import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import nodePolyfills from 'rollup-plugin-polyfill-node';
export default [
  {
    context: 'window',
    input: './script.ts',
    output: {
      file: './public/script.js',
      format: 'iife',
      name: "kostegator"
    },
    plugins: [
      typescript({lib:["dom","es5","es6"]}),
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      nodePolyfills(),
      commonjs(),
    ],
  }
];
