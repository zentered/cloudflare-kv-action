import js from '@eslint/js'
import nodePlugin from 'eslint-plugin-n'
import jsonPlugin from 'eslint-plugin-json'

export default [
  {
    ignores: ['dist/', 'coverage/']
  },
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-module'],
  jsonPlugin.configs['recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  }
]
