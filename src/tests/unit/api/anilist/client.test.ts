import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { request } from "@/api/anilist/client";

// Mock fetch so we don't make actual network requests
global.fetch = vi.fn();

describe("AniList Client", () => {
  // Sample test data
  const sampleQuery = `
    query {
      Page {
        media {
          id
          title {
            english
            romaji
          }
        }
      }
    }
  `;
  const sampleMutation = `
    mutation ($id: Int, $status: MediaListStatus) {
      SaveMediaListEntry (mediaId: $id, status: $status) {
        id
        status
      }
    }
  `;
  const sampleVariables = { search: "Test Manga" };
  const sampleToken = "test-token";

  // Store original electronAPI
  let originalElectronAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original electronAPI
    originalElectronAPI = (window as any).electronAPI;

    // By default, set up the browser environment
    (window as any).electronAPI = undefined;

    // Mock console methods to reduce test output noise
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore original electronAPI
    (window as any).electronAPI = originalElectronAPI;
  });

  it("should make a GraphQL request with correct parameters", async () => {
    // Mock a successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { Page: { media: [] } } }),
    });

    // Call the request function
    await request(sampleQuery, sampleVariables);

    // Verify fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graphql.anilist.co",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          query: sampleQuery,
          variables: sampleVariables,
        }),
      }),
    );
  });

  it("should include authorization header when token is provided", async () => {
    // Mock a successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { Page: { media: [] } } }),
    });

    // Call the request function with a token
    await request(sampleQuery, sampleVariables, sampleToken);

    // Verify fetch was called with the authorization header
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graphql.anilist.co",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${sampleToken}`,
        }),
      }),
    );
  });

  it("should return data from a successful response", async () => {
    // Create mock response data
    const mockData = {
      data: {
        Page: {
          media: [
            { id: 1, title: { english: "Test Manga", romaji: "Test Manga" } },
          ],
        },
      },
    };

    // Mock a successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Call the request function
    const result = await request(sampleQuery, sampleVariables);

    // Verify the result matches the mock data
    expect(result).toEqual(mockData);
  });

  it("should handle GraphQL errors in the response", async () => {
    // Create mock response with GraphQL errors
    const mockErrorResponse = {
      errors: [{ message: "Field 'MediaType' doesn't exist on type 'Query'" }],
    };

    // Mock a response that contains GraphQL errors
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockErrorResponse),
    });

    // Call the request function
    const result = await request(sampleQuery, sampleVariables);

    // Verify the result includes the errors
    expect(result).toEqual(mockErrorResponse);
  });

  it("should handle HTTP error responses", async () => {
    // Mock HTTP error response
    const errorResponse = {
      errors: [{ message: "Bad Request" }],
    };

    // Mock text method correctly
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () => Promise.resolve(JSON.stringify(errorResponse)),
    });

    // Call the request function and expect it to throw with the correct format
    await expect(request(sampleQuery, sampleVariables)).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        statusText: "Bad Request",
        errors: errorResponse.errors,
      }),
    );
  });

  it("should handle rate limiting (429) responses", async () => {
    // Mock rate limit response with text method
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: {
        get: (header: string) => (header === "Retry-After" ? "30" : null),
      },
      text: () =>
        Promise.resolve(
          JSON.stringify({ errors: [{ message: "Rate limit exceeded" }] }),
        ),
    });

    // Mock dispatchEvent to prevent errors
    window.dispatchEvent = vi.fn();

    // Call the request function and expect it to throw
    await expect(request(sampleQuery, sampleVariables)).rejects.toEqual(
      expect.objectContaining({
        status: 429,
        statusText: "Too Many Requests",
        isRateLimited: true,
        retryAfter: 30,
      }),
    );

    // Verify the event was dispatched
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "anilist:rate-limited",
      }),
    );
  });

  it("should handle network errors", async () => {
    // Mock a network error
    const networkError = new Error("Network failure");
    (global.fetch as any).mockRejectedValueOnce(networkError);

    // Call the request function and expect it to throw
    await expect(request(sampleQuery, sampleVariables)).rejects.toThrow(
      "Network failure",
    );
  });

  it("should handle JSON parsing errors", async () => {
    // Mock invalid JSON response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    // Call the request function and expect it to throw
    await expect(request(sampleQuery, sampleVariables)).rejects.toThrow(
      "Invalid JSON",
    );
  });

  it("should handle server errors (500+)", async () => {
    // Mock server error response with text method
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () =>
        Promise.resolve(
          JSON.stringify({ errors: [{ message: "Server error" }] }),
        ),
    });

    // Call the request function and expect it to throw
    await expect(request(sampleQuery, sampleVariables)).rejects.toEqual(
      expect.objectContaining({
        status: 500,
        statusText: "Internal Server Error",
      }),
    );
  });

  it("should handle empty responses", async () => {
    // Mock empty response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    // Call the request function
    const result = await request(sampleQuery, sampleVariables);

    // Verify the result is empty
    expect(result).toEqual({});
  });

  it("should support passing null variables", async () => {
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    // Call request without variables
    await request(sampleQuery);

    // Verify fetch was called with query only
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graphql.anilist.co",
      expect.objectContaining({
        body: expect.not.stringMatching(/"variables":\s*{.*}/s),
      }),
    );
  });

  it("should handle malformed response without a JSON body", async () => {
    // Mock text method correctly
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () => Promise.resolve("Error text"),
    });

    // Call the request function and expect it to throw with the right format
    await expect(request(sampleQuery, sampleVariables)).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        statusText: "Bad Request",
        raw: "Error text",
      }),
    );
  });

  it("should use electronAPI when in Electron environment", async () => {
    // Mock Electron environment
    (window as any).electronAPI = {
      anilist: {
        request: vi.fn().mockResolvedValue({
          data: { Page: { media: [] } },
        }),
      },
    };

    // Call the request function
    await request(sampleQuery, sampleVariables, sampleToken);

    // Verify the Electron API was called
    expect(window.electronAPI.anilist.request).toHaveBeenCalledWith(
      sampleQuery,
      expect.objectContaining(sampleVariables),
      sampleToken,
    );
  });

  it("should handle AbortSignal in browser environment", async () => {
    // Mock a successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { Page: { media: [] } } }),
    });

    // Create abort signal
    const controller = new AbortController();
    const signal = controller.signal;

    // Call the request function with abort signal
    await request(sampleQuery, sampleVariables, undefined, signal);

    // Verify fetch was called with signal
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graphql.anilist.co",
      expect.objectContaining({
        signal,
      }),
    );
  });

  // NEW TESTS BELOW

  it("should handle unauthorized (401) responses", async () => {
    // Mock unauthorized response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () =>
        Promise.resolve(
          JSON.stringify({
            errors: [{ message: "Invalid token" }],
          }),
        ),
    });

    // Call the request function and expect it to throw with the correct format
    await expect(
      request(sampleQuery, sampleVariables, sampleToken),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        statusText: "Unauthorized",
        errors: [{ message: "Invalid token" }],
      }),
    );
  });

  it("should handle forbidden (403) responses", async () => {
    // Mock forbidden response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () =>
        Promise.resolve(
          JSON.stringify({
            errors: [{ message: "Access denied" }],
          }),
        ),
    });

    // Call the request function and expect it to throw with the correct format
    await expect(
      request(sampleQuery, sampleVariables, sampleToken),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 403,
        statusText: "Forbidden",
        errors: [{ message: "Access denied" }],
      }),
    );
  });

  it("should handle not found (404) responses", async () => {
    // Mock not found response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () =>
        Promise.resolve(
          JSON.stringify({
            errors: [{ message: "Resource not found" }],
          }),
        ),
    });

    // Call the request function and expect it to throw with the correct format
    await expect(request(sampleQuery, sampleVariables)).rejects.toEqual(
      expect.objectContaining({
        status: 404,
        statusText: "Not Found",
        errors: [{ message: "Resource not found" }],
      }),
    );
  });

  it("should support mutations with variables", async () => {
    // Mock successful mutation response
    const mockMutationResponse = {
      data: {
        SaveMediaListEntry: {
          id: 12345,
          status: "READING",
        },
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMutationResponse),
    });

    const mutationVariables = { id: 12345, status: "READING" };

    // Call the request function with mutation
    const result = await request(
      sampleMutation,
      mutationVariables,
      sampleToken,
    );

    // Verify the result
    expect(result).toEqual(mockMutationResponse);

    // Verify fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graphql.anilist.co",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: sampleMutation,
          variables: mutationVariables,
        }),
      }),
    );
  });

  it("should handle request cancellation via AbortController", async () => {
    // Create abort controller
    const controller = new AbortController();
    const signal = controller.signal;

    // Mock fetch to simulate being aborted
    (global.fetch as any).mockImplementationOnce(() => {
      // Abort the request right away
      controller.abort("User cancelled operation");

      // Return a promise that will be rejected due to the abort
      return Promise.reject(
        new DOMException("The operation was aborted.", "AbortError"),
      );
    });

    // Call the request function with abort signal and expect it to throw
    await expect(
      request(sampleQuery, sampleVariables, undefined, signal),
    ).rejects.toThrow("The operation was aborted.");
  });

  it("should support custom headers", async () => {
    // Mock fetch with a custom implementation to capture the options
    let capturedOptions: RequestInit | undefined;
    (global.fetch as any).mockImplementationOnce(
      (url: string, options: RequestInit) => {
        capturedOptions = options;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      },
    );

    // Monkey patch the fetch function to add custom headers
    const originalFetch = global.fetch;
    global.fetch = vi.fn((url, options) => {
      const newOptions = {
        ...options,
        headers: {
          ...options?.headers,
          "X-Client-ID": "test-client",
          "X-Custom-Header": "custom-value",
        },
      };
      return originalFetch(url, newOptions);
    });

    try {
      // Call the request function
      await request(sampleQuery, sampleVariables);

      // Verify custom headers were added
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions?.headers).toEqual(
        expect.objectContaining({
          "X-Client-ID": "test-client",
          "X-Custom-Header": "custom-value",
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      );
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });

  it("should handle multiple sequential requests", async () => {
    // Mock responses for two sequential requests
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { first: "response" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { second: "response" } }),
      });

    // Make first request
    const result1 = await request(sampleQuery, { first: true });
    expect(result1).toEqual({ data: { first: "response" } });

    // Make second request
    const result2 = await request(sampleQuery, { second: true });
    expect(result2).toEqual({ data: { second: "response" } });

    // Verify both requests were made with the right parameters
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://graphql.anilist.co",
      expect.objectContaining({
        body: JSON.stringify({
          query: sampleQuery,
          variables: { first: true },
        }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://graphql.anilist.co",
      expect.objectContaining({
        body: JSON.stringify({
          query: sampleQuery,
          variables: { second: true },
        }),
      }),
    );
  });

  it("should handle complex GraphQL error patterns", async () => {
    // Create mock response with complex GraphQL errors
    const mockErrorResponse = {
      errors: [
        {
          message: "Validation failed",
          locations: [{ line: 2, column: 3 }],
          path: ["query", "Page"],
          extensions: {
            code: "VALIDATION_FAILED",
            exception: { stacktrace: ["Error at line 2"] },
          },
        },
        {
          message: "Not authorized",
          path: ["mutation", "SaveMediaListEntry"],
        },
      ],
      data: null,
    };

    // Mock a response that contains complex GraphQL errors
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockErrorResponse),
    });

    // Call the request function
    const result = await request(sampleQuery, sampleVariables);

    // Verify the result includes all error details
    expect(result).toEqual(mockErrorResponse);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].extensions?.code).toBe("VALIDATION_FAILED");
    expect(result.errors[1].message).toBe("Not authorized");
  });
});
