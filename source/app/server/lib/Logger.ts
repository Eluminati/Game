/* tslint:disable:no-console*/
import * as colors from 'colors';
import { createWriteStream } from 'graceful-fs';
import { resolve } from 'path';
import { path as rootPath } from 'app-root-path';
import { isNodeJS } from '../../utils/environment';
import { BDOLogger, logLevels, printEnvironments } from './../../lib/BDOLogger';

/**
 * Logs colored console output and writes to files
 *
 * @export
 * @class Logger
 */
export class Logger extends BDOLogger {
    /**
     * Colors to indicate current log level
     *
     * @private
     * @memberof Logger
     */
    private logLevelColors = {
        log: colors.bold.gray,
        debug: colors.bold.green,
        info: colors.bold.cyan,
        warn: colors.bold.yellow,
        error: colors.bold.red
    };

    constructor(params?: ConstParams<Logger>) {
        super(params);
    }

    /**
     * @inheritdoc
     *
     * @protected
     * @returns {Promise<string>}
     * @memberof Logger
     */
    protected getProcInfo(): string {
        return `${process.env.name || ''} ${process.env.pm_id || ''} ${process.pid}`;
    }

    /**
     * @inheritdoc
     *
     * @protected
     * @param {string} logLevel
     * @param {('console' | 'file')} [printEnv='console']
     * @returns {string}
     * @memberof Logger
     */
    protected getHeader(logLevel: logLevels, printEnv: printEnvironments = 'console'): string {
        let procInfo = this.getProcInfo();
        let currentTime = this.currentTime();
        let upperLogLevel = logLevel.toUpperCase();
        if (isNodeJS() && printEnv === 'console') {
            let formattedLogLevel = this.logLevelColors[logLevel](upperLogLevel);
            let formattedPid = colors.magenta(procInfo);
            let formattedTime = colors.blue(currentTime);
            return `[${formattedLogLevel} - ${formattedPid} - ${formattedTime}]`;
        }
        return `[${upperLogLevel} - ${procInfo} - ${currentTime}]`;
    }

    /**
     * @inheritdoc
     *
     * @protected
     * @param {logLevels} logLevel
     * @param {*} message
     * @memberof Logger
     */
    protected writeToFile(logLevel: logLevels, message: any): void {
        let path = resolve(rootPath, 'var', 'logs', <string>this.logFile);
        let data = `${this.getHeader(logLevel, 'file')} ${message}\n`;
        let stream = createWriteStream(path, {
            encoding: 'utf-8',
            flags: 'a',
            autoClose: true
        });

        stream.write(data, (error) => {
            if (!error) return stream.end();
            console.error(error);
        });
    }
}
