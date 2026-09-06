export const categories = [
  "stay",
  "food",
  "transport",
  "explore",
  "general",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  stay: "Stay",
  food: "Food",
  transport: "Transport",
  explore: "Explore",
  general: "General tip",
};
export const priceUnits = [
  "room_night",
  "bed_night",
  "person_night",
  "meal",
  "item",
  "person_trip",
  "vehicle_trip",
  "entry_person",
  "other",
] as const;
export type PriceUnit = (typeof priceUnits)[number];
export const unitLabels: Record<PriceUnit, string> = {
  room_night: "/ room / night",
  bed_night: "/ bed / night",
  person_night: "/ person / night",
  meal: "/ meal",
  item: "/ item",
  person_trip: "/ person / trip",
  vehicle_trip: "/ vehicle / trip",
  entry_person: "/ person entry",
  other: "Other",
};
export const roomTypes = ["private", "dorm", "shared", "other"] as const;
export const bookingMethods = [
  "direct_call",
  "walk_in",
  "online",
  "other",
] as const;
export const transportModes = [
  "bus",
  "train",
  "shared_jeep",
  "auto",
  "taxi",
  "ferry",
  "rental",
  "other",
] as const;
