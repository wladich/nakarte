const recursive = require('recursive-readdir');
const fs = require('fs-extra');
const gzipSize = require('gzip-size').sync;
const execSync = require('child_process').execSync;
const filesize = require('filesize');
const chalk = require('chalk');
const path = require('path');

const paths = require('../webpack/paths');

function getVersionFromGit() {
    const verCmd = "echo -n `date +%Y-%m-%d_%H:%M:%S`-`git rev-parse --abbrev-ref HEAD`-`git rev-parse --short HEAD``git diff-index --quiet HEAD -- || echo '-dirty'`";
    return execSync(verCmd).toString();
}

// Input: /User/dan/app/build/static/js/main.82be8.js
// Output: /static/js/main.js
function removeFileNameHash(fileName) {
    return fileName
        .replace(paths.appBuild, '')
        .replace(/\/?(.*)(\.\w+)(\.js|\.css)/, (match, p1, p2, p3) => p1 + p3);
}

function getSizes() {
    return new Promise((resolve) => {
        recursive(paths.appBuild, (err, fileNames) => {
            const previousSizeMap = (fileNames || [])
                .filter(fileName => /\.(js|css)$/.test(fileName))
                .reduce((memo, fileName) => {
                    const contents = fs.readFileSync(fileName);
                    const key = removeFileNameHash(fileName);
                    memo[key] = gzipSize(contents);
                    return memo;
                }, {});
            resolve(previousSizeMap);
        });
    });
}

// Print a detailed summary of build files.
function printFileSizes(sizeMap, previousSizeMap) {
    const FIFTY_KILOBYTES = 1024 * 50;
    const assets = Object.entries(sizeMap)
        .map(([filename, size]) => {
            // const previousSize = previousSizeMap[filename];
            const difference = size - previousSizeMap[filename];
            // const difference = getDifferenceLabel(size, previousSize);
            return {
                folder: path.join('build', path.dirname(filename)),
                name: path.basename(filename),
                size: size,
                difference: difference,
            };
        });
    assets.sort((a, b) => b.size - a.size);
    for (let asset of assets) {
        let sizeLabel = '  ' + filesize(asset.size);
        let differenceLabel = '';
        let labelSize = sizeLabel.length;
        if (asset.difference !== 0) {
            let differenceColor;
            if (asset.difference > FIFTY_KILOBYTES) {
                differenceColor = chalk.red;
            } else if (asset.difference > 0) {
                differenceColor = chalk.yellow;
            } else {
                differenceColor = chalk.green;
            }
            differenceLabel = asset.difference.toString();
            if (asset.difference > 0) {
                differenceLabel = '+' + differenceLabel;
            }
            labelSize += differenceLabel.length;
            differenceLabel = differenceColor(differenceLabel);
            differenceLabel = `  (${differenceLabel})`;
            labelSize += 4;
        }
        const padding = ' '.repeat(Math.max(30 - labelSize, 0));
        console.log(sizeLabel + differenceLabel + padding + chalk.dim(asset.folder + path.sep) + chalk.cyan(asset.name));
    }
}


async function main() {
    process.env.NODE_ENV = 'production';
    const version = getVersionFromGit();
    process.env.RELEASE_VER = version;
    console.log('Creating an optimized production build...');
    console.log('Version:', version);
    const prevSizes = await getSizes();
    try {
        execSync("webpack --config webpack/webpack.config.prod.js  --colors", {stdio: "inherit"});
    }
    catch (e) {
        process.exit(1);
    }
    console.log(chalk.green('Compiled successfully.'));
    const newSizes = await getSizes();
    console.log('File sizes after gzip:\n');
    printFileSizes(newSizes, prevSizes);
}

main();