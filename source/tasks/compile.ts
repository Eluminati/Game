import { render } from 'less';
import { path as rootPath } from 'app-root-path';
import { resolve as resolvePath, dirname, basename } from 'path';
import { readFileSync, writeFileSync } from 'graceful-fs';
// eslint-disable-next-line
// @ts-ignore
import lessPluginCleanCSS from 'less-plugin-clean-css';
import { sync as mkDirSync } from 'mkdirp';
import { walk, getCorrespondingFile } from "./../utils/projectStructure";
import { buildSchema } from "./../utils/schemaGenerator";
import { WalkStats } from "walk";
import { parse } from "yaml";
import { merge } from "lodash";
import jsonToTs from "json-to-ts";

/**
 * Compiles several formats in source folder to corresponding compilation in out folder
 *
 * @param grunt The grunt instance
 */
module.exports = (grunt: IGrunt): void => {
    grunt.config.merge({
        compile: {
            less: {
                src: 'source/app/client/less/**/*.less',
                program: 'less'
            },
            config: {
                src: ['out/app/config/**/*.yml', 'out/app/client/config/**/*.yml', 'out/app/client/server/**/*.yml'],
                program: "config"
            },
            schema: {
                src: ['source/app/client/ts/models/**/*.ts', 'source/app/server/models/**/*.ts'],
                program: "schema"
            }
        }
    });

    grunt.event.on('watchChokidar', function watchChokidar(_action: string, filePath: string, target: string) {
        grunt.config(`${target}.src`, filePath);
        grunt.config(`${target}.program`, target.split('.').pop());
    });

    grunt.registerMultiTask('compile', 'Compiles Less', function task() {
        let realSrc = this.filesSrc;
        if (!realSrc.length) realSrc = [grunt.task.current.data.src];
        const done = this.async();
        const currentProgram = grunt.task.current.data.program;
        grunt.log.ok(grunt.task.current.data.program);
        if (currentProgram === "less") {
            compileLess().then(() => { done(`Finished!`); });
        } else if (currentProgram === "config") {
            compileConfig(grunt).then(() => { done(`Finished!`); });
        } else if (currentProgram === "schema") {
            compileSchema(grunt, realSrc).then(() => { done(`Finished!`); });
        } else done();
    });
};

/**
 * Compiles less files to a css bundle
 *
 * @returns A promise which indicates that the compilation is ready
 */
function compileLess(): Promise<void> {
    return new Promise<void>((resolve) => {
        const sourcePath = resolvePath(rootPath, 'source', 'app', 'client', 'less');
        const promises: Promise<Less.RenderOutput | void>[] = [];
        walk(sourcePath, (filePath) => {
            if (!(filePath === resolvePath(sourcePath, "global.less") || filePath.startsWith(resolvePath(sourcePath, "themes")))) return;
            render(readFileSync(filePath).toString(), {
                filename: filePath,
                plugins: [
                    new lessPluginCleanCSS({
                        advanced: true
                    })
                ]
            }).then((output) => {
                const outPath = getCorrespondingFile(filePath);
                mkDirSync(dirname(outPath));
                writeFileSync(outPath, output.css, {
                    encoding: 'utf-8'
                });
                resolve();
            });
        });
        Promise.all(promises).then(() => resolve());
    });
}

/**
 * Compiles typescript interfaces for type save config
 *
 * @param grunt The grunt instance
 * @returns A promise which indicates ready state
 */
function compileConfig(grunt: IGrunt) {
    return new Promise<void>((resolve) => {
        const bdoConfig = resolvePath(rootPath, "out", "app", "config");
        const clientConfig = resolvePath(rootPath, "out", "app", "client", "config");
        const serverConfig = resolvePath(rootPath, "out", "app", "server", "config");
        const configs: Record<"bdo" | "client" | "server", Record<string, any>> = {
            server: {},
            client: {},
            bdo: {}
        };

        const handler = (fileOrDir: string, status: WalkStats) => {
            if (!status.isFile() || !fileOrDir.endsWith(".yml")) return;
            if (![bdoConfig, clientConfig, serverConfig].includes(dirname(fileOrDir))) return;
            grunt.log.ok(`processing config ${fileOrDir}`);

            if (fileOrDir.startsWith(bdoConfig)) {
                configs.bdo[basename(fileOrDir).replace(".yml", "")] = parse(readFileSync(fileOrDir).toString());
            }

            if (fileOrDir.startsWith(clientConfig)) {
                configs.client[basename(fileOrDir).replace(".yml", "")] = parse(readFileSync(fileOrDir).toString());
            }

            if (fileOrDir.startsWith(serverConfig)) {
                configs.server[basename(fileOrDir).replace(".yml", "")] = parse(readFileSync(fileOrDir).toString());
            }
        };

        const promisses = [
            walk(bdoConfig, handler),
            walk(clientConfig, handler),
            walk(serverConfig, handler)
        ];

        Promise.all(promisses).then(() => {
            const interfaceJSON = { server: {}, client: {} };
            interfaceJSON.client = configs.bdo;
            interfaceJSON.server = merge({}, configs.bdo, configs.server);
            interfaceJSON.client = merge({}, configs.bdo, configs.client);
            let interfaceString = "/* eslint-disable */export ";
            jsonToTs(interfaceJSON, { rootName: "IConfig" }).forEach((typeInterface) => {
                interfaceString += typeInterface;
            });
            writeFileSync(resolvePath(rootPath, "source", "app", "interfaces", "Config.ts"), interfaceString, { encoding: "utf-8" });
            resolve();
        });
    });
}

/**
 * Compiles models to JSON schema to be able to validate api calls
 *
 * @param grunt The grunt interface
 * @param filePaths the file path which should be compiles
 * @returns A promise which indicates ready state
 */
function compileSchema(grunt: IGrunt, filePaths: string[]) {
    return new Promise<void>((resolver) => {
        const modelsToCompile: string[] = [];
        const args: Array<[string, string]> = [];

        for (const filePath of filePaths) {
            if (filePath.includes("source/app/client/ts/models")) {
                if (modelsToCompile.includes("client")) continue;
                modelsToCompile.push("client");
                args.push([
                    resolvePath(rootPath, "source", "app", "client", "ts", "tsconfig.json"),
                    resolvePath(rootPath, "source", "app", "client", "ts", "interfaces", "api.json")
                ]);
            }
            if (filePath.includes("source/app/server/models")) {
                if (modelsToCompile.includes("server")) continue;
                modelsToCompile.push("server");
                args.push([
                    resolvePath(rootPath, "tsconfig.json"),
                    resolvePath(rootPath, "source", "app", "server", "interfaces", "api.json")
                ]);
            }
        }

        for (const arg of args) {
            grunt.log.ok(`Creating schema: ${arg[1]}`);
            buildSchema(...arg);
        }
        resolver();
    });
}
