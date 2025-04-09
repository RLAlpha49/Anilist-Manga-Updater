import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RateLimitProvider,
  useRateLimit,
} from "../../../contexts/RateLimitContext";

// Mock the toast function from sonner
vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn().mockReturnValue("mock-toast-id"),
    dismiss: vi.fn(),
  },
}));

// Mock electronAPI
beforeEach(() => {
  window.electronAPI = {
    anilist: {
      getRateLimitStatus: vi.fn().mockResolvedValue({
        isRateLimited: false,
        retryAfter: null,
      }),
    },
  } as any;
});

// Create a test component that uses the RateLimit context
function TestComponent() {
  const { rateLimitState, setRateLimit, clearRateLimit } = useRateLimit();

  return (
    <div>
      <div data-testid="is-rate-limited">
        {String(rateLimitState.isRateLimited)}
      </div>
      <div data-testid="retry-after">
        {rateLimitState.retryAfter !== null
          ? rateLimitState.retryAfter
          : "null"}
      </div>
      <div data-testid="message">{rateLimitState.message || "null"}</div>
      <button
        data-testid="set-rate-limit"
        onClick={() => setRateLimit(true, 60, "Test rate limit message")}
      >
        Set Rate Limit
      </button>
      <button data-testid="clear-rate-limit" onClick={clearRateLimit}>
        Clear Rate Limit
      </button>
    </div>
  );
}

describe("RateLimitContext", () => {
  it("provides the rate limit context values", () => {
    render(
      <RateLimitProvider>
        <TestComponent />
      </RateLimitProvider>,
    );

    // Check that the context values are rendered
    expect(screen.getByTestId("is-rate-limited")).toBeInTheDocument();
    expect(screen.getByTestId("retry-after")).toBeInTheDocument();
    expect(screen.getByTestId("message")).toBeInTheDocument();

    // Check initial values
    expect(screen.getByTestId("is-rate-limited")).toHaveTextContent("false");
    expect(screen.getByTestId("retry-after")).toHaveTextContent("null");
    expect(screen.getByTestId("message")).toHaveTextContent("null");
  });

  it("throws an error when used outside provider", () => {
    // Silence the expected error in the console
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useRateLimit must be used within a RateLimitProvider");

    // Restore console.error
    (console.error as any).mockRestore();
  });
});
