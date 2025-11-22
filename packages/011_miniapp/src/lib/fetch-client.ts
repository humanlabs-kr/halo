import { Result } from "./try-catch";

const getUrl = (contextUrl: string): string => {
  const url = `${import.meta.env.VITE_API_URL}${contextUrl}`;
  return url;
};

const getHeaders = (headers?: HeadersInit): HeadersInit => {
  if (headers?.["Content-Type"] === "multipart/form-data") {
    delete headers["Content-Type"];
    return headers;
  }
  return {
    "Content-Type": "application/json",
    ...headers,
  };
};

export const customFetch = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  const requestUrl = getUrl(url);
  const requestHeaders = getHeaders(options.headers);

  const requestInit: RequestInit = {
    ...options,
    credentials: "include",
    headers: requestHeaders,
  };

  const response = await fetch(requestUrl, requestInit);
  if (!response.ok) {
    const result = (await response.json()) as {
      code: string;
      message: string;
    };
    throw {
      code: result.code,
      message: result.message,
    };
  }

  const data = (await response.json()) as T;

  return {
    status: response.status,
    data: data,
  } as T;
};

export const callApi = async <
  T extends (...args: unknown[]) => Promise<{ status: number; data: unknown }>,
  Response = Awaited<ReturnType<T>>,
>(
  fn: T,
  ...args: Parameters<T>
): Promise<
  Result<
    Response extends { status: 200; data: infer D } ? D : never,
    Response extends { status: 200 }
      ? never
      : Response extends { data: infer E }
        ? E
        : never
  >
> => {
  try {
    const requestArgs = [...args] as Parameters<T>;

    const response = await fn(...requestArgs);

    if (response.status >= 200 && response.status < 300) {
      return {
        data: response.data as Response extends { status: 200; data: infer D }
          ? D
          : never,
        error: null,
      };
    } else {
      return {
        data: null,
        error: response.data as Response extends { status: 200 }
          ? never
          : Response extends { data: infer E }
            ? E
            : never,
      };
    }
  } catch (error) {
    const errorData = (error as { data?: unknown }).data || error;
    return {
      data: null,
      error: errorData as never,
    };
  }
};
