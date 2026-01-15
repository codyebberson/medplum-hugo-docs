module.exports = {
  parser: 'postcss-scss',
  plugins: {
    'postcss-pxtorem': {
      rootValue: 16,
      propList: ['*'],
      replace: true
    }
  }
}