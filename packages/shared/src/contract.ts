import type { components } from './api.js';

/** All schemas declared in `docs/openapi.yaml#/components/schemas`. */
export type Schemas = components['schemas'];

/** Look up a contract schema by name, e.g. `Schema<'Order'>`. */
export type Schema<Name extends keyof Schemas> = Schemas[Name];

export type ApiErrorResponse = Schemas['ErrorResponse'];
export type ApiErrorBody = ApiErrorResponse['error'];
export type ApiErrorDetail = Schemas['ErrorDetail'];
export type HealthResponse = Schemas['HealthResponse'];
export type Money = Schemas['Money'];
export type PaginationMeta = Schemas['PaginationMeta'];
