import { randomUUID } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'http';

function normalizeOptionalHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (t.length === 0 || t.length > 128) return undefined;
  return t;
}

function reqId(req: IncomingMessage): string | undefined {
  return (req as IncomingMessage & { id?: string }).id;
}

/** NB-ARC-003: JSON logs in prod, pretty in dev; request + correlation IDs; optional tenant/user for tracing. */
export function createPinoParams(config: ConfigService): Params {
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const isDev = nodeEnv === 'development' || nodeEnv === 'dev';
  const level = config.get<string>('LOG_LEVEL', 'info');

  return {
    pinoHttp: {
      level,
      genReqId: (req: IncomingMessage) => {
        const fromRequestId = normalizeOptionalHeader(req.headers['x-request-id']);
        if (fromRequestId) return fromRequestId;
        const fromCorrelation = normalizeOptionalHeader(
          req.headers['x-correlation-id'],
        );
        if (fromCorrelation) return fromCorrelation;
        return randomUUID();
      },
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["set-cookie"]',
        ],
        remove: true,
      },
      customProps: (req: IncomingMessage, _res: ServerResponse) => {
        const id = reqId(req);
        return {
          requestId: id,
          correlationId:
            normalizeOptionalHeader(req.headers['x-correlation-id']) ?? id,
          tenantId: normalizeOptionalHeader(req.headers['x-tenant-id']),
          userId: normalizeOptionalHeader(req.headers['x-user-id']),
        };
      },
      customErrorObject: (
        req: IncomingMessage,
        _res: ServerResponse,
        _err: Error,
        val: Record<string, unknown>,
      ) => {
        const id = reqId(req);
        return {
          ...val,
          requestId: id,
          correlationId:
            normalizeOptionalHeader(req.headers['x-correlation-id']) ?? id,
          tenantId: normalizeOptionalHeader(req.headers['x-tenant-id']),
          userId: normalizeOptionalHeader(req.headers['x-user-id']),
        };
      },
    },
  };
}
