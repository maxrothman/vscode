/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';
import { IServerChannel } from 'vs/base/parts/ipc/common/ipc';
import { ILogger, ILoggerOptions, log, LogLevel } from 'vs/platform/log/common/log';
import { ILoggerMainService } from 'vs/platform/log/electron-main/loggerService';

export class LoggerChannel implements IServerChannel {

	private readonly loggers = new Map<string, ILogger>();

	constructor(private readonly loggerService: ILoggerMainService) { }

	listen(_: unknown, event: string, windowId?: number): Event<any> {
		switch (event) {
			case 'onDidChangeLoggerResources': return windowId ? this.loggerService.getOnDidChangeLoggerResourcesEvent(windowId) : this.loggerService.onDidChangeLoggerResources;
			case 'onDidChangeLogLevel': return windowId ? this.loggerService.getOnDidChangeLogLevelEvent(windowId) : this.loggerService.onDidChangeLogLevel;
		}
		throw new Error(`Event not found: ${event}`);
	}

	async call(_: unknown, command: string, arg?: any): Promise<any> {
		switch (command) {
			case 'createLogger': this.createLogger(URI.revive(arg[0]), arg[1]); return;
			case 'log': return this.log(URI.revive(arg[0]), arg[1]);
			case 'consoleLog': return this.consoleLog(arg[0], arg[1]);
			case 'setLogLevel': return this.loggerService.setLogLevel(URI.revive(arg[0]), arg[1]);
			case 'registerLoggerResource': return this.loggerService.registerLoggerResource({ ...arg[0], resource: URI.revive(arg[0].resource) }, arg[1]);
			case 'deregisterLoggerResource': return this.loggerService.deregisterLoggerResource(URI.revive(arg[0]));
		}

		throw new Error(`Call not found: ${command}`);
	}

	private createLogger(file: URI, options: ILoggerOptions): void {
		this.loggers.set(file.toString(), this.loggerService.createLogger(file, options));
	}

	private consoleLog(level: LogLevel, args: any[]): void {
		let consoleFn = console.log;

		switch (level) {
			case LogLevel.Error:
				consoleFn = console.error;
				break;
			case LogLevel.Warning:
				consoleFn = console.warn;
				break;
			case LogLevel.Info:
				consoleFn = console.info;
				break;
		}

		consoleFn.call(console, ...args);
	}

	private log(file: URI, messages: [LogLevel, string][]): void {
		const logger = this.loggers.get(file.toString());
		if (!logger) {
			throw new Error('Create the logger before logging');
		}
		for (const [level, message] of messages) {
			log(logger, level, message);
		}
	}
}

