'use strict';

const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Webpack = require('webpack');

const paths = require('./paths');

const errorExitStatus = 1;

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
                corejs: {version: '3.8', proposals: true},
                modules: 'commonjs',
                exclude: ['proposal-dynamic-import'],
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
        ...(isTesting ? ['babel-plugin-rewire'] : []),
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
        type: 'asset/inline',
    },
    {
        test: /\.(html)(\?.*)?$/u,
        loader: 'raw-loader',
    },
    {
        test: /\.csv$/u,
        loader: 'csv-loader',
        options: {
            dynamicTyping: true,
            header: true,
            skipEmptyLines: true,
        },
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
        use: [
            {
                loader: 'babel-loader',
                options: babelConfig,
            },
        ],
        type: 'javascript/auto',
    },

    {
        test: /\.s?css/iu,
        use: isProduction ? productionCSSLoader : developmentCSSLoader,
    },
];

module.exports = {
    mode: isProduction ? 'production' : 'development',
    devtool: false,
    stats: 'errors-warnings',
    bail: isProduction || isTesting,
    devServer: {
        client: {
            overlay: false,
        },
    },

    entry: {
        app: paths.appIndexJs,
    },

    optimization: {
        splitChunks: {
            chunks: 'all',
        },
        runtimeChunk: 'single',
        minimizer: [
            new TerserPlugin({
                parallel: true,
                exclude: /node_modules\/mapillary/u,
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
