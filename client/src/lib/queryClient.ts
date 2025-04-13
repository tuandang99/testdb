import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = '';
    
    try {
      // Thử đọc dưới dạng JSON trước
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Phản hồi là JSON
        const errorData = await res.clone().json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // Phản hồi không phải JSON, đọc dưới dạng text
        const text = await res.clone().text();
        
        // Nếu văn bản có dạng HTML, rút gọn nó
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          errorMessage = `Server returned HTML error page (${res.status}: ${res.statusText})`;
        } else {
          errorMessage = text;
        }
      }
    } catch (err) {
      // Không thể đọc phản hồi
      errorMessage = res.statusText || `Error ${res.status}`;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
