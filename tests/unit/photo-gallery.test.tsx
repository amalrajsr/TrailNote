// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoGallery } from "../../src/components/contributions/photo-gallery";

const photos = [
  {
    path: "/uploads/trail.jpg",
    width: 1200,
    height: 800,
    alt: "Forest trail",
  },
  {
    path: "/uploads/beach.jpg",
    width: 800,
    height: 1200,
    alt: "Beach below green hills",
  },
  {
    path: "/uploads/cafe.jpg",
    width: 1000,
    height: 1000,
    alt: "Cafe entrance",
  },
];

describe("PhotoGallery", () => {
  it("renders nothing when the tip has no photos", () => {
    const { container } = render(<PhotoGallery photos={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("uses the cropped single-photo preview and singular label", () => {
    render(<PhotoGallery photos={[photos[1]]} />);

    expect(screen.getByRole("heading", { name: "Photos" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View photo" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/View all 1/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open photo 1 of 1: Beach below green hills",
      }).parentElement,
    ).toHaveClass("detail-single-photo");
    expect(screen.getByText(/Preview images are cropped/)).toBeInTheDocument();
  });

  it("opens the full viewer and wraps keyboard navigation", () => {
    render(<PhotoGallery photos={photos} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open photo 1 of 3: Forest trail",
      }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("1 / 3");
    expect(
      screen.getByRole("img", { name: "Forest trail" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(dialog).toHaveTextContent("3 / 3");
    expect(
      screen.getByRole("img", { name: "Cafe entrance" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(dialog).toHaveTextContent("1 / 3");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
