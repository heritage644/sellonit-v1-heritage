import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import type { ApiErrorDetail } from '@sellonit/shared';
import { AppError } from '../app-error.js';

export interface RequestSchemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

export type ValidatedInput<S extends RequestSchemas> = {
  [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never;
};

const INPUT_KEY = 'validatedInput';

export function zodIssuesToDetails(
  issues: readonly z.core.$ZodIssue[],
  prefix?: string,
): ApiErrorDetail[] {
  return issues.map((issue) => {
    const path = issue.path.map(String).join('.');
    const field = [prefix, path].filter((part) => part !== undefined && part !== '').join('.');
    return { field, code: issue.code, message: issue.message };
  });
}

/**
 * Validate request params/query/body with zod before the handler runs.
 * On failure responds 400 VALIDATION_ERROR with one ErrorDetail per issue
 * (`field` is prefixed with `params.`, `query.` or `body.`).
 *
 * Parsed (coerced, defaulted, stripped) values are read with `getInput`,
 * because Express 5 exposes `req.query` as a read-only getter.
 */
export function validate<S extends RequestSchemas>(schemas: S): RequestHandler {
  return (req: Request, res: Response, next) => {
    const details: ApiErrorDetail[] = [];
    const input: Record<string, unknown> = {};

    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        input[part] = result.data;
      } else {
        details.push(...zodIssuesToDetails(result.error.issues, part));
      }
    }

    if (details.length > 0) {
      next(AppError.validation(details));
      return;
    }

    res.locals[INPUT_KEY] = input;
    next();
  };
}

/** Typed access to the values produced by `validate(schemas)` for this request. */
export function getInput<S extends RequestSchemas>(res: Response, _schemas: S): ValidatedInput<S> {
  return res.locals[INPUT_KEY] as ValidatedInput<S>;
}
