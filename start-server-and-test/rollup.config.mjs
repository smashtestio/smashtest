import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import strip from '@rollup/plugin-strip';

const removeShebang = {
    name: 'remove-shebang',
    transform(code, id) {
        if (/node_modules/.test(id)) {
            const newCode = code.replace(/^#!.*/, '');
            return {
                code: newCode,
                map: null
            };
        }
    }
};

export default {
    input: './node_modules/start-server-and-test/src/bin/start.js',
    output: {
        file: './bundle.js',
        format: 'es'
    },
    plugins: [
        removeShebang,
        json(),
        resolve({ preferBuiltins: true }),
        commonjs(),
        babel({
            exclude: 'node_modules/**',
            babelHelpers: 'bundled',
            presets: ['@babel/preset-env']
        }),
        strip({
            include: ['./node_modules/start-server-and-test/**/*.(js|mjs)']
        })
    ],
    external: []
};
