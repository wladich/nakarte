const Webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');

const paths = require('./paths');

module.exports = {
  entry: {
    app: paths.appIndexJs
  },
  output: {
    path: paths.appBuild,
    filename: 'js/[name].[chunkhash:8].js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: true
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin([
      { from: paths.appPublic, to: 'public' }
    ]),
    new HtmlWebpackPlugin({
      template: paths.appIndexHtml
    }),
    new Webpack.DefinePlugin({
      'NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'RELEASE_VER': JSON.stringify(process.env.RELEASE_VER || 'local devel')
    }),
    new StyleLintPlugin({
      config: {"extends": "stylelint-config-recommended"},
      files: [
          'src/**/*.css',
          'vendored/**/*.css',
      ],
      emitWarning: true
    })
  ],
  resolve: {
    alias: {
      '~': paths.appSrc
    }
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      },
      {
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: '[path][name].[ext]'
          }
        }
      },
      {
        test: /\.(html)(\?.*)?$/,
        loader: 'raw-loader'
      },
    ]
  }
};
