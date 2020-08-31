module.exports = {
    env: {
        commonjs: true,
        es2020: true,
        node: true
    },
    extends: [
        'standard'
    ],
    parserOptions: {
        ecmaVersion: 11
    },
    rules: {
        indent: [ 'error', 4 ],
        'comma-dangle': [ 'error', 'never' ],
        'no-underscore-dangle': 0,
        'max-len': 0,
        'array-bracket-spacing': [ 'error', 'always' ]
    }
}
