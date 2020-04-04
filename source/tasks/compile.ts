import { render } from 'less';
import { path as rootPath } from 'app-root-path';
import { resolve as resolvePath, dirname, basename } from 'path';
import { readFileSync, writeFileSync } from 'graceful-fs';
// @ts-ignore
import lessPluginCleanCSS from 'less-plugin-clean-css';
import { sync as mkDirSync } from 'mkdirp';
import { walk, getCorrespondingFile } from "./../utils/projectStructure";

/**
 * Compiles several formats in source folder to corresponding compilation in out folder
 *
 * @param {IGrunt} grunt
 * @returns {void}
 */
module.exports = (grunt: IGrunt): void => {
    grunt.config.merge({
        compile: {
            less: {
                src: 'source/app/client/less/**/*.less',
                program: 'less'
            }
        }
    });

    grunt.event.on('watchChokidar', function watchChokidar(_action: string, filePath: string, target: string) {
        grunt.config(`${target}.src`, filePath);
        grunt.config(`${target}.program`, target.split('.').pop());
    });

    grunt.registerMultiTask('compile', 'Compiles Less', function task() {
        const done = this.async();
        compileLess().then(() => { done(`Finished!`); });
    });
};

/**
 * Compiles less files to a css bundle
 *
 * @returns {Promise<any>}
 */
function compileLess(): Promise<any> {
    return new Promise<any>((resolve: Function) => {
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
