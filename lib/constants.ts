// ── Domain constants ────────────────────────────────────────────────────────
// Categories are stored as slugs. Labels/icons live here so the DB stays clean.

export type CategorySlug =
  | 'transport' | 'food' | 'groceries' | 'rent'
  | 'wifi' | 'water' | 'electric' | 'custom' | 'care';

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  icon: string;
  /** Stable categories repeat near-exactly, so they get the full 3-chip row. */
  stable: boolean;
  /** Bills that make sense as one-tap monthly templates. */
  recurring: boolean;
  /**
   * Excluded from the monthly budget, the category breakdown and quest maths.
   * Health commitments are not discretionary spending — folding them into the
   * daily picture would make an ordinary month look like an overspent one, and
   * a budget gauge that turns red because of medical costs is exactly the kind of
   * shaming this app is built to avoid. Logging still earns XP.
   */
  offBudget?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'transport', label: 'Transport', icon: '🚗', stable: true,  recurring: false },
  { slug: 'food',      label: 'Food',      icon: '🍜', stable: false, recurring: false },
  { slug: 'groceries', label: 'Groceries', icon: '🛒', stable: true,  recurring: false },
  { slug: 'rent',      label: 'Rent',      icon: '🏠', stable: true,  recurring: true  },
  { slug: 'wifi',      label: 'WiFi',      icon: '📶', stable: true,  recurring: true  },
  { slug: 'water',     label: 'Water',     icon: '💧', stable: true,  recurring: true  },
  { slug: 'electric',  label: 'Electric',  icon: '⚡', stable: true,  recurring: true  },
  { slug: 'custom',    label: 'Other',     icon: '✨', stable: false, recurring: false },
  { slug: 'care',      label: 'Health',      icon: '🩺', stable: true,  recurring: false,
    offBudget: true },
];

/** Category slugs kept out of budget totals, breakdowns and quests. */
export const OFF_BUDGET: readonly string[] =
  CATEGORIES.filter((c) => c.offBudget).map((c) => c.slug);

/**
 * SQL fragment restricting a query to budgeted spending. Interpolated as a
 * parameter array so there is exactly one definition of "off budget" — adding
 * another such category here updates every total at once.
 */
export const OFF_BUDGET_SQL = OFF_BUDGET;

export const CATEGORY_MAP: Record<string, CategoryDef> =
  Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

/** Food splits into two subtypes; Delivery is the deliberately "fuzzy" one. */
export type FoodSubtype = 'delivery' | 'cooked';

export const FOOD_SUBTYPES: { slug: FoodSubtype; label: string; icon: string }[] = [
  { slug: 'delivery', label: 'Delivery', icon: '🛵' },
  { slug: 'cooked',   label: 'Cooked',   icon: '🍳' },
];

/**
 * Health splits into the appointment itself and the travel to get there. Both belong
 * to the same commitment, so they live in one section and one export sheet,
 * with the type recorded so the split stays visible.
 */
export type CareSubtype = 'session' | 'travel';

export const CARE_SUBTYPES: { slug: CareSubtype; label: string; icon: string }[] = [
  { slug: 'session', label: 'Appointment', icon: '🩺' },
  { slug: 'travel',  label: 'Travel',  icon: '🚕' },
];

/** Subtype options for a category, or null if it has none. */
export function subtypesFor(category: string) {
  if (category === 'food') return FOOD_SUBTYPES;
  if (category === 'care') return CARE_SUBTYPES;
  return null;
}

/**
 * Which (category, subtype) pairs get the full 3-chip amount row vs. a single
 * "~" starting-point chip.
 *
 * Food → Delivery totals shift every order (fees, promos, different items), so
 * three precise-looking chips would imply accuracy that isn't there and invite
 * saving a stale number. It gets one chip, prefixed "~", meaning "edit me".
 */
export function chipModeFor(category: string, subtype: string | null): 'full' | 'approx' {
  if (category === 'food') {
    // Delivery totals drift every order; Cooked repeats like a stable category.
    return subtype === 'delivery' ? 'approx' : 'full';
  }
  // An appointment fee is fixed; the fare to get there varies with route and surge.
  if (category === 'care') {
    return subtype === 'travel' ? 'approx' : 'full';
  }
  return CATEGORY_MAP[category]?.stable ? 'full' : 'approx';
}

export const MAX_CHIPS_FULL = 3;
export const MAX_CHIPS_APPROX = 1;
