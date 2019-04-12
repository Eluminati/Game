const arp = require('app-root-path');
const path = require('path');
const os = require('os');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const projectStructureUtils = require('./out/utils/projectStructure');

module.exports = {
    entry: () => new Promise((resolve) => {
        const entryPoints = [];
        const appDir = path.resolve(arp.path, "source", "app");
        const notStartWith = path.resolve(appDir, "server");
        projectStructureUtils.walk(path.resolve(arp.path, "source", "app"), (file) => {
            if (file.endsWith(".ts") && !file.endsWith(".d.ts") && !file.startsWith(notStartWith) && path.dirname(file) !== appDir) {
                entryPoints.push(file);
            }
        }).then(() => {
            resolve(entryPoints);
        });
    }),
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "out", "app", "client", "js")
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: [".ts", ".tsx", ".js"]
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            useTypescriptIncrementalApi: true,
            tsconfig: path.resolve(arp.path, "source", "app", "client", "ts", "tsconfig.json")
        }),
        new ForkTsCheckerNotifierWebpackPlugin({
            title: 'Frontend',
            excludeWarnings: false
        }),
        new webpack.NormalModuleReplacementPlugin(/type-graphql$/, resource => {
            resource.request = resource.request.replace(/type-graphql/, "type-graphql/dist/browser-shim");
        })
    ],
    optimization: {
        noEmitOnErrors: true
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: [
                {
                    loader: 'cache-loader',
                    options: {
                        cacheDirectory: path.resolve(arp.path, "var", "buildcache", ".frontend")
                    }
                },
                {
                    loader: 'thread-loader',
                    options: {
                        // there should be 1 cpu for the fork-ts-checker-webpack-plugin
                        workers: Math.floor((os.cpus().length - 1) / 2),
                        poolRespawn: false,
                        poolTimeout: Infinity // set this to Infinity in watch mode - see https://github.com/webpack-contrib/thread-loader
                    }
                },
                {
                    loader: 'ts-loader',
                    options: {
                        happyPackMode: true // IMPORTANT! use happyPackMode mode to speed-up compilation and reduce errors reported to webpack
                    }
                }
            ]
        }]
    }
    //devtool: "inline-source-map"
};