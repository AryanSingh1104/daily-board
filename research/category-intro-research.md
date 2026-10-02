# Category introductions: research and recommended copy

Research date: October 2, 2026. Recommendation: show one clear instruction line and a nonspoiler example on a category’s first opening in each daily board, then retain an easy way to reopen it. Current beta uses pools of **2 / 3 / 4 items**, with **1 / 2 / 3 correct** required for **100 / 200 / 300 points**. Every tile allows one miss; a second miss closes it. A full board has 36 items and needs at least 24 correct responses to earn all 2,400 points.

## Five useful observations from primary sources

1. **Jeopardy explains category conventions before the clues.** An official production article describes Ken pausing during the category presentation to explain that an unusually worded title meant 13-letter words. A playful title can coexist with plain instructions. [Official production account](https://www.jeopardy.com/jbuzz/behind-scenes/control-room-sports-emmys-and-two-whole-episodes-recap).
2. **Daily Orbs puts the action directly beneath the title.** Its archived matching puzzle identifies what belongs on each side, and provides a separate help control. [Foreign Exchange VIII](https://dailyorbs.com/foreign-exchange-viii).
3. **Blank-filling instructions specify what the blank represents.** Its film puzzle identifies the missing item as a city and explains the accompanying hints. [Movie Cities](https://dailyorbs.com/movie-cities).
4. **Set-naming puzzles show a bounded task.** Its archived city-set puzzle displays six open slots and a single answer input; the format tutorial explains submitting one answer at a time. [Happiest Places on Earth](https://dailyorbs.com/happiest-places-on-earth), [ranked-list puzzle with format help](https://dailyorbs.com/heavy-metal).
5. **Help and progress are separate.** Daily Orbs’ official rules allow leaving and returning while retaining progress. Our explanatory overlay should similarly leave attempts and score untouched. [Daily Orbs rules](https://dailyorbs.com/how-to-play).

The Daily Orbs observations come from the live browser inspection in this research session. These sources support clear category-specific explanation; they do not establish a universal industry rule for when an introduction must appear.

## Proposed first-open copy

| Category / format | One-line instruction | Example only — unscored |
|---|---|---|
| **Music · Fill the blank** | Complete each music name or title by typing the missing word. | Rolling ___ → **Stones** |
| **Movies · Fill the blank** | Complete each movie title by typing the missing word. | Jurassic ___ → **Park** |
| **Countries · Matching** | Match each place or clue to its country. | Big Ben ↔ **United Kingdom** |
| **Wildcard · Name the set** | Name distinct answers that fit the set, one at a time. | Name a season → **Spring** |

Keep instructions aligned with the actual authored prompts: if a Music category contains only band names, shorten its line to “Complete each band name by typing the missing word.” Avoid a broad instruction that promises formats the tile does not use. These example pairs were selected separately from the proposed scored data; exclude them from that board’s live questions and answer pool when implementing.

## Display and repeat-access rules

- On the first selected tile in a category, show the category title, one instruction line, the small **“Example only”** pair, and **“Start 100-point tile”** (using the selected value). This should fit in a compact card.
- Track acknowledgement **per category instance per daily board**. Mark it seen only when the player presses Start. Closing it to return to the board does not consume an attempt or mark it acknowledged.
- On later openings of that category in the same board, go straight to play. Keep a visible **“Rules”** button beside the category title; it reopens the same explanation without changing progress.
- Show the introduction again on a new board, even if the broad category name recurs: its theme or format may have changed. A saved rules-version identifier can also invalidate an old acknowledgement if the rules change.
- Use the selected tile’s requirement as a separate, persistent line: **“1 of 2 correct · 1 miss allowed”**, **“2 of 3 correct · 1 miss allowed”**, or **“3 of 4 correct · 1 miss allowed.”** Do not bury the threshold in a dismissible introduction. A second wrong answer ends the scored attempt, as does any state where the target is unreachable.
- For blanks and matching, add **“One try per item.”** For open set naming, say **“2 guesses”**, **“3 guesses”**, or **“4 guesses”** as applicable; the whole set has a shared submission budget. Empty entries and already accepted answers consume no guess.
- Opening help, viewing an example, and dismissing it are always unscored. Preserve focus on close and let keyboard users reach Start and Rules.

This brings in Jeopardy’s concise explanation of a category’s premise while fitting the daily board’s separate formats and current threshold rules.
