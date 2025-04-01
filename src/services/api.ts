import { ErrorType, createError, AppError } from "../utils/errorHandling";

const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface RequestOptions extends RequestInit {
  timeout?: number;
}

export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      let errorMessage = "An error occurred during the request";
      let errorType = ErrorType.API;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If we can't parse the error as JSON, just use the status text
        errorMessage = response.statusText || errorMessage;
      }

      // Categorize errors based on status code
      if (response.status === 401 || response.status === 403) {
        errorType = ErrorType.AUTHENTICATION;
      } else if (response.status === 400 || response.status === 422) {
        errorType = ErrorType.VALIDATION;
      } else if (response.status >= 500) {
        errorType = ErrorType.API;
      }

      throw createError(errorType, errorMessage, {
        statusCode: response.status,
      });
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw createError(
        ErrorType.NETWORK,
        "Network connection error. Please check your internet connection and try again.",
      );
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw createError(
        ErrorType.NETWORK,
        "Request timed out. Please try again later.",
      );
    }

    // Unknown error
    throw createError(
      ErrorType.UNKNOWN,
      error instanceof Error ? error.message : "An unknown error occurred",
      { originalError: error },
    );
  }
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    apiRequest<T>(url, { method: "GET", ...options }),

  post: <T>(url: string, data: any, options?: RequestOptions) =>
    apiRequest<T>(url, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    }),

  put: <T>(url: string, data: any, options?: RequestOptions) =>
    apiRequest<T>(url, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    }),

  patch: <T>(url: string, data: any, options?: RequestOptions) =>
    apiRequest<T>(url, {
      method: "PATCH",
      body: JSON.stringify(data),
      ...options,
    }),

  delete: <T>(url: string, options?: RequestOptions) =>
    apiRequest<T>(url, { method: "DELETE", ...options }),
};
