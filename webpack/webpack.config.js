'use strict';

const Webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const paths = require('./paths');

const errorExitStatus = 1;
const urlLoaderSizeLimit = 10000;

const envs = {
    production: true,
    development: true,
    testing: true,
};

const mode = process.env.NODE_ENV;

if (!envs[mode]) {
    console.log(`NODE_ENV has invalid value "${mode}"`);
    process.exit(errorExitStatus);
}

const isProduction = mode === 'production';
const isDevelopment = mode === 'development';
const isTesting = mode === 'testing';

const productionOutput = {
    path: paths.appBuild,
    filename: 'static/js/[name].[contenthash:8].js',
};

const babelConfig = {
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'usage',
                corejs: '3.0.0',
                modules: 'commonjs',
            },
        ],
    ],
    overrides: [
        {
            test: './src/vendored/github.com/augustl/js-unzip/js-unzip.js',
            sourceType: 'script',
        },
    ],

    plugins: [
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
    ],
};

const sourceMapOption = {
    filename: '[file].map',
    columns: isProduction,
    exclude: /mapillary/u,
};

const DevToolPlugin = isProduction ? Webpack.SourceMapDevToolPlugin : Webpack.EvalSourceMapDevToolPlugin;

const plugins = [
    ...(isProduction ? [new CleanWebpackPlugin()] : []),
    ...(isProduction ? [new CopyWebpackPlugin({patterns: [{from: paths.appPublic, to: ''}]})] : []),
    new HtmlWebpackPlugin({
        template: paths.appIndexHtml,
        minify: false,
    }),
    ...(isProduction || isDevelopment
        ? [
              new MiniCssExtractPlugin({
                  filename: 'static/css/[name].[contenthash:8].css',
              }),
          ]
        : []),
    new Webpack.DefinePlugin({
        NODE_ENV: JSON.stringify(mode),
        RELEASE_VER: JSON.stringify(process.env.RELEASE_VER || 'local devel'),
    }),
    ...(isProduction || isDevelopment
        ? [
              new StyleLintPlugin({
                  config: {extends: 'stylelint-config-recommended'},
                  files: ['src/**/*.css', 'vendored/**/*.css'],
                  emitWarning: isDevelopment,
                  emitError: isProduction,
              }),
          ]
        : []),
    new DevToolPlugin(sourceMapOption),
];

const productionCSSLoader = [
    MiniCssExtractPlugin.loader,
    {loader: 'css-loader', options: {importLoaders: 1}},
    {
        loader: 'postcss-loader',
        options: {
            ident: 'postcss',
            plugins: () => [require('postcss-import')(), require('postcss-preset-env')(), require('cssnano')()],
        },
    },
];

const developmentCSSLoader = ['style-loader', {loader: 'css-loader', options: {importLoaders: 1}}];

const loaders = [
    {
        test: /\.mjs$/u,
        include: /node_modules/u,
        type: 'javascript/auto',
    },
    {
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/u,
        use: {
            loader: 'url-loader',
            options: {
                limit: isProduction || isDevelopment ? urlLoaderSizeLimit : false,
                name: '[path][name].[ext]',
            },
        },
    },
    {
        test: /\.(html)(\?.*)?$/u,
        loader: 'raw-loader',
    },

    ...(isProduction || isDevelopment
        ? [
              {
                  test: /\.js$/u,
                  include: paths.appSrc,
                  enforce: 'pre',
                  loader: 'eslint-loader',
                  options: {
                      emitWarning: !isProduction,
                  },
              },
          ]
        : []),

    {
        test: /\.js$/u,
        exclude: isProduction ? [/node_modules\/core-js/u, /node_modules\/webpack/u] : /node_modules/u,
        loaders: [
            {
                loader: 'babel-loader',
                options: babelConfig,
            },
        ],
    },

    {
        test: /\.s?css/iu,
        loaders: isProduction ? productionCSSLoader : developmentCSSLoader,
    },
];

module.exports = {
    mode: isProduction ? 'production' : 'development',
    devtool: false,
    stats: 'errors-warnings',
    bail: isProduction || isTesting,

    entry: isTesting
        ? false
        : {
              app: paths.appIndexJs,
          },

    optimization: {
        splitChunks: {
            chunks: 'all',
            name: true,
        },
        runtimeChunk: 'single',
        minimizer: [
            new TerserPlugin({
                cache: true,
                parallel: true,
                sourceMap: true,
                exclude: /mapillary/u,
            }),
        ],
    },

    resolve: {
        alias: {
            '~': paths.appSrc,
        },
    },

    output: isProduction ? productionOutput : {},
    plugins: plugins,
    module: {
        rules: loaders,
    },
};
