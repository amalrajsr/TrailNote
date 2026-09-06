import { type PriceUnit, unitLabels } from "./constants";
export function parseMoney(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(v))
    throw new Error("Enter a price with up to two decimal places.");
  const [whole, fraction = ""] = v.split(".");
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paise > 100000000n) throw new Error("Price must be at most ₹10,00,000.");
  return Number(paise);
}
export function formatMoney(
  paise: number | null,
  unit: PriceUnit | null,
): string {
  if (paise === null) return "Price not provided";
  if (paise === 0 && unit === "entry_person") return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
}
export function priceSuffix(unit: PriceUnit | null, label: string | null) {
  return unit === "other" ? `/ ${label}` : unit ? unitLabels[unit] : "";
}
