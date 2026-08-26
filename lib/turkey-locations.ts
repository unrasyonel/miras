import data from "../data/turkey-locations.json";

export type TurkeyLocation = {
  name: string;
  province: string;
  level: "province" | "district";
};

export const turkeyLocations = data.locations as TurkeyLocation[];

const provinces = new Map(
  turkeyLocations
    .filter((location) => location.level === "province")
    .map((location) => [normalizeLocation(location.name), location.name]),
);

export function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatTurkeyLocation(location: TurkeyLocation) {
  return location.level === "province"
    ? `${location.name}, Türkiye`
    : `${location.name}, ${location.province}, Türkiye`;
}

export function provinceFromLocation(value?: string) {
  if (!value) return undefined;
  const parts = value.split(",").map((part) => normalizeLocation(part));
  for (const part of parts) {
    const province = provinces.get(part);
    if (province) return province;
  }
  return undefined;
}

export function sharedParentLocation(first?: string, second?: string) {
  if (!first || !second) return undefined;
  if (normalizeLocation(first) === normalizeLocation(second)) return first;
  const firstProvince = provinceFromLocation(first);
  const secondProvince = provinceFromLocation(second);
  return firstProvince && firstProvince === secondProvince ? `${firstProvince}, Türkiye` : undefined;
}
