const Webpack = require('webpack');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const common = require('./webpack.common.js');
const paths = require('./paths');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  stats: 'errors-warnings',
  bail: true,
  output: {
    filename: 'js/[name].[chunkhash:8].js',
    chunkFilename: 'js/[name].[chunkhash:8].js'
  },
  plugins: [
    new Webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new Webpack.optimize.ModuleConcatenationPlugin(),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[chunkhash:8].css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        include: paths.appSrc,
        enforce: 'pre',
        loader: 'eslint-loader',
      },

      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.s?css/i,
        use : [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  }
});
