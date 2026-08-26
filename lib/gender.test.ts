import { describe, expect, it } from "vitest";
import { inferGender } from "./gender";

describe("inferGender", () => {
  it("recognizes Turkish and compound names", () => {
    expect(inferGender("Muhammed Furkan Yılmaz")).toBe("male");
    expect(inferGender("Zehra Nur Demir")).toBe("female");
    expect(inferGender("Dr. Ayşe Kaya")).toBe("female");
  });

  it("does not guess unknown names", () => {
    expect(inferGender("Xyz Qrt")).toBeUndefined();
  });
});
