const Webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const paths = require('./paths');

module.exports = {
  entry: {
    app: paths.appIndexJs
  },
  output: {
    path: paths.appBuild,
    filename: 'js/[name].js'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: false
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
          loader: 'file-loader',
          options: {
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
