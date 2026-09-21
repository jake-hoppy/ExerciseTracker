# Food log

The core of the app. Everything else is context around this.

## The insight this is built on

The same handful of meals repeat constantly. Over one 30-day block the same
Konala burrito bowl and Core Power shake were looked up three separate times,
along with a recurring Jimmy Dean breakfast and a standard Chick-fil-A order.

So this is **not a food database.** A food database is millions of items, a
search problem, barcode lookups and an external API — and maybe fifteen
entries of it would ever get used.

It's a **saved items list that builds itself from what you log.** Design for
fifteen frequent items, not a million rare ones.

## Schema

```prisma
model FoodItem {
  id        String  @id @default(cuid())
  name      String                    // "Konala burrito bowl"
  calories  Int
  protein   Int
  timesUsed Int      @default(0)
  lastUsed  DateTime?
  archived  Boolean  @default(false)
  entries   Entry[]
}

model Entry {
  id       String    @id @default(cuid())
  day      Day       @relation(fields: [dayId], references: [id])
  dayId    String
  item     FoodItem? @relation(fields: [itemId], references: [id])
  itemId   String?                    // null for a one-off
  name     String?                    // label for a one-off
  calories Int
  protein  Int
  loggedAt DateTime  @default(now())
}
```

**Entries copy the numbers, they don't reference them.** If a saved item's
macros are corrected later, history must not silently change — last month's
2,100-calorie day stays a 2,100-calorie day. `itemId` exists for usage counts
and nothing else.

Day totals are the sum of that day's entries, computed on read, never stored
(rule R6c).

## Logging flow

The whole thing should be three taps for a repeat meal.

**Today's card shows:**
- Running totals, calories and protein, with the delta against target
- The day's entries as a short list, each removable
- An add control

**Add:**
1. Saved items first, **ordered by `timesUsed` descending**, most-used at the
   top where the thumb is. Not alphabetical. Not recency alone.
2. A search box that filters as you type — only earns its place past ~20 items
3. "Quick add" — two number fields, calories and protein, no name required.
   For anything one-off. Saving it to the list is one optional tap afterward.

**Editing:** tap an entry to change its numbers for that day only. Editing the
saved item is a separate action, reachable from the item list, and it never
touches history.

## Seed list

Start the list pre-populated. An empty list on day one means typing everything
once, which is exactly the friction this feature exists to remove.

| Item | Cal | Protein |
|---|---|---|
| Konala chicken burrito bowl | 751 | 54 |
| Konala southwest chicken bowl | 601 | 46 |
| Konala dry rub chicken (add-on) | 357 | 39 |
| Core Power Elite chocolate | 240 | 42 |
| Fairlife chocolate milk | 150 | 30 |
| Chick-fil-A spicy chicken sandwich | 450 | 28 |
| Chick-fil-A grilled nuggets, 12 ct | 200 | 38 |
| In-N-Out 3x3 | 800 | 50 |
| In-N-Out fries | 370 | 5 |
| Taco Bell cantina chicken bowl | 520 | 25 |
| Jimmy Dean sausage, 1/4 roll | 323 | 14 |
| Large egg | 72 | 6 |
| Thomas' English muffin | 150 | 5 |
| Cheddar slice | 90 | 5 |

Verify these against current menus before seeding — restaurant numbers drift,
and several of the above were derived rather than read off an official chart.

## Explicitly not building

- Barcode scanning
- An external food API (USDA, Open Food Facts, Nutritionix)
- Recipes, meal plans, or ingredient-level breakdown
- Micronutrients
- Photo recognition

Every one of these is a project. None of them serve someone eating the same
fifteen things.

## The test

If logging a repeat meal takes more than three taps, the design is wrong.
That is the single number to optimise here — a food log that's slow to use is
a food log that stops getting used, and that is exactly how the prototype died.
