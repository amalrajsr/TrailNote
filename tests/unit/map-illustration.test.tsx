// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapIllustration } from "../../src/components/destinations/map-illustration";

const destinations = [
  {
    slug: "badami",
    name: "Badami",
    state: "Karnataka",
    latitude: 15.9186,
    longitude: 75.6761,
  },
  {
    slug: "hampi",
    name: "Hampi",
    state: "Karnataka",
    latitude: 15.335,
    longitude: 76.46,
  },
  {
    slug: "varkala",
    name: "Varkala",
    state: "Kerala",
    latitude: 8.7379,
    longitude: 76.7163,
  },
  {
    slug: "delhi",
    name: "Delhi",
    state: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
  },
];

describe("MapIllustration", () => {
  it("groups close places and exposes each destination on selection", () => {
    render(<MapIllustration destinations={destinations} />);

    const map = screen.getByRole("navigation", { name: "Map destinations" });
    const cluster = screen.getByRole("button", {
      name: "Explore 2 nearby places: Badami, Hampi",
    });
    expect(cluster).toBeVisible();
    expect(map.querySelectorAll("a")).toHaveLength(2);

    fireEvent.click(cluster);

    expect(map.querySelectorAll("a")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Badami, Karnataka" }),
    ).toHaveAttribute("href", "/destinations/badami");
    expect(
      screen.getByRole("link", { name: "Hampi, Karnataka" }),
    ).toHaveAttribute("href", "/destinations/hampi");
    expect(screen.getByRole("button", { name: "← All India" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "← All India" }));
    expect(
      screen.getByRole("button", {
        name: "Explore 2 nearby places: Badami, Hampi",
      }),
    ).toHaveFocus();
  });
});
