const Webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');
const path = require('path');

const paths = require('./paths');

const envs = {
    production: true,
    development: true
};

const mode = process.env.NODE_ENV;

if (!envs[mode]) {
    console.log(`NODE_ENV has invalid value "${mode}"`);
    process.exit(1);
}

const isProduction = mode === 'production';

function dependenciesPaths() {
    const blackList = ['core-js', 'regenerator-runtime'];
    const paths = [];
    const package_json_path = path.resolve(__dirname, '../package.json');
    const package_json = JSON.parse(fs.readFileSync(package_json_path));
    for (let dependency in package_json.dependencies) {
        if (blackList.includes(dependency)) {
            continue;
        }
        const depPath = path.resolve(__dirname, '../node_modules', dependency);
        if (!fs.existsSync(depPath)) {
            throw new Error(`Dependency ${dependency} not found at path ${depPath}`);
        }
        paths.push(depPath);
    }
    return paths;
}

const productionOutput = {
    path: paths.appBuild,
    filename: 'static/js/[name].[contenthash:8].js'
};

const babelConfig = {
    "presets": [
        [
            "@babel/preset-env",
            {
                "useBuiltIns": "usage",
                "corejs": "3.0.0",
                "modules": "commonjs"
            }
        ]
    ],
    "overrides": [
        {
            "test": "./src/vendored/github.com/augustl/js-unzip/js-unzip.js",
            "sourceType": "script"
        }
    ],

    "plugins": [
        "@babel/plugin-syntax-dynamic-import",
        "@babel/plugin-proposal-class-properties"
    ]
};

const plugins = [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin([
        { from: paths.appPublic, to: '' }
    ]),
    new HtmlWebpackPlugin({
        template: paths.appIndexHtml,
        minify: false
    }),
    new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css'
    }),
    new Webpack.DefinePlugin({
        'NODE_ENV': JSON.stringify(mode),
        'RELEASE_VER': JSON.stringify(process.env.RELEASE_VER || 'local devel')
    }),
    new StyleLintPlugin({
        config: {"extends": "stylelint-config-recommended"},
        files: [
            'src/**/*.css',
            'vendored/**/*.css',
        ],
        emitWarning: !isProduction,
        emitError: isProduction
    })
];

const cacheLoader = {
    loader: 'cache-loader',
    options: {
        cacheDirectory: 'build_cache'
    }
};

const productionCSSLoader = [
    MiniCssExtractPlugin.loader,
    {loader: 'css-loader', options: {importLoaders: 1}},
    {
        loader: 'postcss-loader',
        options: {
            ident: 'postcss',
            plugins: () => [
                require('postcss-import')(),
                require('postcss-preset-env')(),
                require('cssnano')()
            ]
        }
    },
];

const developmentCSSLoader = [
    'style-loader',
    {loader: 'css-loader', options: {importLoaders: 1}},
];

const loaders = [
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

    {
        test: /\.js$/,
        include: paths.appSrc,
        enforce: 'pre',
        loader: 'eslint-loader',
        options: {
            emitWarning: !isProduction
        }
    },

    {
        test: /\.js$/,
        include: [paths.appSrc].concat(isProduction ? dependenciesPaths() : []),
        loaders: [
            cacheLoader,
            {
                loader: 'babel-loader',
                options: babelConfig
            }
        ],
    },

    {
        test: /\.s?css/i,
        loaders : isProduction ? productionCSSLoader : developmentCSSLoader
    }
];

module.exports = {
    mode: mode,
    devtool: isProduction ? 'source-map' : 'cheap-eval-source-map',
    stats: 'errors-warnings',
    bail: isProduction,

    entry: {
        app: paths.appIndexJs
    },

    optimization: {
        splitChunks: {
            chunks: 'all',
            name: true
        },
        runtimeChunk: 'single',
    },

    resolve: {
        alias: {
            '~': paths.appSrc
        }
    },

    output: isProduction ? productionOutput : {},
    plugins: plugins,
    module: {
        rules: loaders
    }
};
