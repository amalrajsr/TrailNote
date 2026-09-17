// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toast, Toaster } from "../../src/components/ui/toaster";

afterEach(cleanup);

describe("toaster", () => {
  it("shows and dismisses a notification", () => {
    render(<Toaster />);

    act(() => toast("Tip link copied"));
    expect(screen.getByRole("status")).toHaveTextContent("Tip link copied");

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("turns an authentication URL signal into a one-time toast", () => {
    window.history.replaceState(null, "", "/?authToast=signed-out");
    render(<Toaster />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Signed out successfully",
    );
    expect(window.location.search).toBe("");
  });
});
