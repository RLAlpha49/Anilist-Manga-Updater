import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RematchOptions } from "../../../components/matching/RematchOptions";

// Mock framer-motion to prevent animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

describe("RematchOptions", () => {
  // Mock data
  const mockSelectedStatuses = {
    pending: true,
    skipped: true,
    matched: false,
    manual: false,
  };

  const mockMatchResults = [
    {
      id: 1,
      status: "pending",
      kenmeiManga: { title: "Manga 1" },
      anilistMatches: [],
      selectedMatch: null,
      matchDate: new Date().toISOString(),
    },
    {
      id: 2,
      status: "pending",
      kenmeiManga: { title: "Manga 2" },
      anilistMatches: [],
      selectedMatch: null,
      matchDate: new Date().toISOString(),
    },
    {
      id: 3,
      status: "skipped",
      kenmeiManga: { title: "Manga 3" },
      anilistMatches: [],
      selectedMatch: null,
      matchDate: new Date().toISOString(),
    },
    {
      id: 4,
      status: "matched",
      kenmeiManga: { title: "Manga 4" },
      anilistMatches: [],
      selectedMatch: { id: 100 },
      matchDate: new Date().toISOString(),
    },
    {
      id: 5,
      status: "manual",
      kenmeiManga: { title: "Manga 5" },
      anilistMatches: [],
      selectedMatch: { id: 200 },
      matchDate: new Date().toISOString(),
    },
  ];

  // Mock functions
  const mockOnChangeSelectedStatuses = vi.fn();
  const mockOnRematchByStatus = vi.fn();
  const mockOnCloseOptions = vi.fn();

  // Common render function
  const renderComponent = (warning: string | null = null) => {
    return render(
      <RematchOptions
        selectedStatuses={mockSelectedStatuses}
        onChangeSelectedStatuses={mockOnChangeSelectedStatuses}
        matchResults={mockMatchResults}
        rematchWarning={warning}
        onRematchByStatus={mockOnRematchByStatus}
        onCloseOptions={mockOnCloseOptions}
      />,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with correct status counts", () => {
    // Arrange & Act
    const { container } = renderComponent();

    // Assert
    expect(screen.getByText("Rematch Options")).toBeInTheDocument();

    // Find the badges by their container divs and verify the text content
    const pendingBadge = screen
      .getByLabelText("Pending")
      .closest(".bg-background")
      ?.querySelector(".bg-muted\\/80");
    expect(pendingBadge).toHaveTextContent("2");

    const skippedBadge = screen
      .getByLabelText("Skipped")
      .closest(".bg-background")
      ?.querySelector("[class*='bg-red-50']");
    expect(skippedBadge).toHaveTextContent("1");

    const matchedBadge = screen
      .getByLabelText("Matched")
      .closest(".bg-background")
      ?.querySelector("[class*='bg-green-50']");
    expect(matchedBadge).toHaveTextContent("1");

    const manualBadge = screen
      .getByLabelText("Manual")
      .closest(".bg-background")
      ?.querySelector("[class*='bg-blue-50']");
    expect(manualBadge).toHaveTextContent("1");

    // Check the total count (2 pending + 1 skipped = 3)
    const totalCountContainer = screen.getByText(/manga to rematch/, {
      exact: false,
    });
    expect(totalCountContainer).toHaveTextContent("3");
  });

  it("displays warning when provided", () => {
    // Arrange & Act
    const warningMessage = "This will clear all existing matches";
    renderComponent(warningMessage);

    // Assert
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText(warningMessage)).toBeInTheDocument();
  });

  it("toggles status checkboxes correctly", () => {
    // Arrange
    renderComponent();

    // Act - toggle "pending" status
    const pendingCheckbox = screen.getByLabelText("Pending");
    fireEvent.click(pendingCheckbox);

    // Assert
    expect(mockOnChangeSelectedStatuses).toHaveBeenCalledWith({
      ...mockSelectedStatuses,
      pending: false,
    });

    // Act - toggle "matched" status
    const matchedCheckbox = screen.getByLabelText("Matched");
    fireEvent.click(matchedCheckbox);

    // Assert
    expect(mockOnChangeSelectedStatuses).toHaveBeenCalledWith({
      ...mockSelectedStatuses,
      matched: true,
    });
  });

  it("calls reset function with default values", () => {
    // Arrange
    renderComponent();

    // Act
    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    // Assert
    expect(mockOnChangeSelectedStatuses).toHaveBeenCalledWith({
      pending: true,
      skipped: true,
      matched: false,
      manual: false,
    });
  });

  it("calls close function when X button is clicked", () => {
    // Arrange
    renderComponent();

    // Find the close button by its SVG icon
    const closeButton = document
      .querySelector("button svg.lucide-x")
      ?.closest("button");
    expect(closeButton).toBeInTheDocument();

    // Act
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    // Assert
    expect(mockOnCloseOptions).toHaveBeenCalledTimes(1);
  });

  it("calls rematch function when rematch button is clicked", () => {
    // Arrange
    renderComponent();

    // Act
    const rematchButton = screen.getByText(/Fresh Search Selected/);
    fireEvent.click(rematchButton);

    // Assert
    expect(mockOnRematchByStatus).toHaveBeenCalledTimes(1);
  });

  it("disables rematch button when no items are selected", () => {
    // Arrange
    const noSelectionStatus = {
      pending: false,
      skipped: false,
      matched: false,
      manual: false,
    };

    render(
      <RematchOptions
        selectedStatuses={noSelectionStatus}
        onChangeSelectedStatuses={mockOnChangeSelectedStatuses}
        matchResults={mockMatchResults}
        rematchWarning={null}
        onRematchByStatus={mockOnRematchByStatus}
        onCloseOptions={mockOnCloseOptions}
      />,
    );

    // Assert
    const rematchButton = screen.getByText(/Fresh Search Selected \(0\)/);
    expect(rematchButton).toBeDisabled();
  });
});
