// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {};
}

if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { CustomSelect } from "../../src/components/ui/custom-select";

describe("CustomSelect", () => {
  it("opens and emits the selected option value", async () => {
    const onValueChange = vi.fn();

    render(
      <CustomSelect
        value="recent"
        onValueChange={onValueChange}
        ariaLabel="Sort tips"
        options={[
          { value: "recent", label: "Most recent" },
          { value: "newest", label: "Newest" },
        ]}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Sort tips" });
    expect(trigger).toHaveTextContent("Most recent");

    fireEvent.click(trigger);

    fireEvent.click(await screen.findByRole("option", { name: "Newest" }));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("newest");
    });
  });
});
