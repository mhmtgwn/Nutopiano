import { ConsoleLogger, Injectable } from '@nestjs/common';
import { requestContext } from '../context/request-context';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

@Injectable()
export class JsonLoggerService extends ConsoleLogger {
  private write(level: LogLevel, message: unknown, optionalParams: unknown[]) {
    const timestamp = new Date().toISOString();
    const context = this.resolveContext(optionalParams);
    const { requestId } = requestContext.get();

    const payload: Record<string, unknown> = {
      level,
      timestamp,
      message: this.serializeMessage(message),
    };

    if (context) {
      payload.context = context;
    }

    if (requestId) {
      payload.requestId = requestId;
    }

    if (level === 'error' && optionalParams.length > 0) {
      const first = optionalParams[0];
      if (typeof first === 'string' && first.length > 0) {
        payload.trace = first;
      }
    }

    const line = JSON.stringify(payload);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
      return;
    }
    process.stdout.write(`${line}\n`);
  }

  private resolveContext(optionalParams: unknown[]) {
    if (optionalParams.length === 0) return undefined;
    const maybeContext = optionalParams[optionalParams.length - 1];
    return typeof maybeContext === 'string' ? maybeContext : undefined;
  }

  private serializeMessage(message: unknown) {
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof Error) {
      return message.message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  override log(message: unknown, ...optionalParams: unknown[]) {
    this.write('log', message, optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  override verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('verbose', message, optionalParams);
  }

  override fatal(message: unknown, ...optionalParams: unknown[]) {
    this.write('fatal', message, optionalParams);
  }
}
