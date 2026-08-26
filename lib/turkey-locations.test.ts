import { describe, expect, it } from "vitest";
import { formatTurkeyLocation, normalizeLocation, sharedParentLocation, turkeyLocations } from "./turkey-locations";

describe("Turkey locations", () => {
  it("contains every province and current districts", () => {
    expect(turkeyLocations.filter((location) => location.level === "province")).toHaveLength(81);
    expect(turkeyLocations.filter((location) => location.level === "district")).toHaveLength(973);
  });

  it("finds Erzurum without requiring Turkish diacritics", () => {
    const erzurum = turkeyLocations.find((location) => normalizeLocation(location.name) === normalizeLocation("erzurum"));
    expect(erzurum && formatTurkeyLocation(erzurum)).toBe("Erzurum, Türkiye");
  });

  it("infers shared province from different districts", () => {
    expect(sharedParentLocation("Yakutiye, Erzurum, Türkiye", "Palandöken, Erzurum, Türkiye")).toBe("Erzurum, Türkiye");
  });
});
