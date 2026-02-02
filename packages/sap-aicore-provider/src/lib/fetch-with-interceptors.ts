import type { FetchFunction } from '@ai-sdk/provider-utils';

type RequestInterceptor = (request: Request) => Request | void | Promise<Request | void>;

export function fetchWithInterceptors(baseFetch: FetchFunction = globalThis.fetch) {
  const requestInterceptors: RequestInterceptor[] = [];

  const interceptedFetch: FetchFunction = async (input, init) => {
    let request = input instanceof Request ? input : new Request(input, init);

    for (const interceptor of requestInterceptors) {
      const result = await interceptor(request);
      if (result instanceof Request) {
        request = result;
      }
    }

    return baseFetch(request);
  };

  return {
    fetch: interceptedFetch,
    interceptors: {
      request: {
        use(interceptor: RequestInterceptor) {
          requestInterceptors.push(interceptor);
        },
        clear() {
          requestInterceptors.length = 0;
        }
      }
    }
  };
}
