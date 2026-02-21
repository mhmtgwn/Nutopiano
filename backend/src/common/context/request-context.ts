import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = {
  businessId?: number;
  userId?: number;
  role?: string;
  requestId?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  },
  get(): RequestContext {
    return storage.getStore() ?? {};
  },
};
