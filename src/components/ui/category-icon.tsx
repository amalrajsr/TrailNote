import {
  BedDouble,
  Utensils,
  BusFront,
  Mountain,
  Lightbulb,
  Compass,
} from "lucide-react";
import type { Category } from "../../lib/constants";
export function CategoryIcon({ category }: { category: Category | "all" }) {
  const Icon = {
    stay: BedDouble,
    food: Utensils,
    transport: BusFront,
    explore: Mountain,
    general: Lightbulb,
    all: Compass,
  }[category];
  return <Icon aria-hidden size={18} strokeWidth={1.75} />;
}
