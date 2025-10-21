import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: './script.ts',
    output: {
      file: './script.js',
      format: 'iife',
      name: "kostegator"
    },
    plugins: [
      typescript({lib:["dom","es5","es6"]}),
      nodeResolve(),
      commonjs(),
    ],
  }
];