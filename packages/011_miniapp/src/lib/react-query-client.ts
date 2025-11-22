/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface APIError<T = any> extends Error {
  status: number;
  body: T;
}

// T = 성공 타입, E = 에러 타입
export async function customInstance<T, E = any>({
  url,
  method = "GET",
  params,
  data,
  headers,
  signal,
}: {
  url: string;
  method?: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<T> {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v != null) as [
          string,
          string
        ][]
      ).toString()
    : "";

  const finalUrl =
    import.meta.env.VITE_API_URL +
    (queryString ? `${url}?${queryString}` : url);

  const fetchInit = {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body:
      data && !["GET", "HEAD"].includes(method.toUpperCase())
        ? JSON.stringify(data)
        : undefined,
    signal,
    credentials: "include",
  } satisfies RequestInit;

  if (headers?.["Content-Type"] === "multipart/form-data") {
    delete fetchInit.headers["Content-Type"];
    fetchInit.body = data;
  }

  const response = await fetch(finalUrl, fetchInit);

  if (!response.ok) {
    let body: any;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw body as E;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
