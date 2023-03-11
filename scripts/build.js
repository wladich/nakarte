'use strict';

const chalk = require('chalk');
const execSync = require('child_process').execSync;
const filesize = require('filesize').filesize;
const fs = require('fs-extra');
const gzipSize = require('gzip-size').sync;
const path = require('path');
const recursive = require('recursive-readdir');

const paths = require('../webpack/paths');

const errorExitStatus = 1;

function getVersionFromGit() {
    const verCmd =
        'echo -n ' +
        '`date +%Y-%m-%d_%H:%M:%S`-' +
        '`git rev-parse --abbrev-ref HEAD`-' +
        '`git rev-parse --short HEAD`' +
        '`git diff-index --quiet HEAD -- || echo -dirty`';
    return execSync(verCmd).toString();
}

// Input: /User/dan/app/build/static/js/main.82be8.js
// Output: /static/js/main.js
function removeFileNameHash(fileName) {
    return fileName.replace(/\/?(.*)(\.[0-9a-f]+)(\.js|\.css)/u, (match, p1, p2, p3) => p1 + p3);
}

function getSizes(removeNameHash) {
    return new Promise((resolve) => {
        recursive(paths.appBuild, (err, fileNames) => {
            const previousSizeMap = (fileNames || [])
                .filter((fileName) => /\.(js|css)$/u.test(fileName))
                .reduce((memo, fileName) => {
                    const contents = fs.readFileSync(fileName);
                    const relativeFileName = fileName.replace(paths.appBuild + '/', '');
                    const key = removeNameHash ? removeFileNameHash(relativeFileName) : relativeFileName;
                    memo[key] = gzipSize(contents);
                    return memo;
                }, {});
            resolve(previousSizeMap);
        });
    });
}

// Print a detailed summary of build files.
function printFileSizes(sizeMap, previousSizeMap) {
    const ASSET_DIFF_SIZE_WARNING_THRESHOLD = 50000;
    const assets = Object.entries(sizeMap).map(([filename, size]) => {
        const difference = size - (previousSizeMap[removeFileNameHash(filename)] || 0);
        return {
            folder: path.join('build', path.dirname(filename)),
            name: path.basename(filename),
            size: size,
            difference: difference,
        };
    });
    assets.sort((a, b) => b.size - a.size);
    for (const asset of assets) {
        const sizeLabel = '  ' + filesize(asset.size);
        let differenceLabel = '';
        let labelSize = sizeLabel.length;
        if (asset.difference !== 0) {
            let differenceColor;
            if (asset.difference > ASSET_DIFF_SIZE_WARNING_THRESHOLD) {
                differenceColor = chalk.red;
            } else if (asset.difference > 0) {
                differenceColor = chalk.yellow;
            } else {
                differenceColor = chalk.green;
            }
            differenceLabel = filesize(asset.difference);
            if (asset.difference > 0) {
                differenceLabel = '+' + differenceLabel;
            }
            labelSize += differenceLabel.length;
            differenceLabel = differenceColor(differenceLabel);
            differenceLabel = `  (${differenceLabel})`;
            const labelSizeAllowance = 4;
            labelSize += labelSizeAllowance;
        }
        const maxLabelSize = 30;
        const padding = ' '.repeat(Math.max(maxLabelSize - labelSize, 0));
        console.log(
            sizeLabel + differenceLabel + padding + chalk.dim(asset.folder + path.sep) + chalk.cyan(asset.name)
        );
    }
}

async function main() {
    process.env.NODE_ENV = 'production';
    const version = getVersionFromGit();
    process.env.RELEASE_VER = version;
    console.log('Creating an optimized production build...');
    console.log('Version:', version);
    const prevSizes = await getSizes(true);
    try {
        execSync('webpack --config webpack/webpack.config.js  --color --progress=profile', {
            stdio: 'inherit',
        });
    } catch (e) {
        process.exit(errorExitStatus);
    }
    console.log(chalk.green('Compiled successfully.'));
    const newSizes = await getSizes(false);
    console.log('File sizes after gzip:\n');
    printFileSizes(newSizes, prevSizes);
}

main();
