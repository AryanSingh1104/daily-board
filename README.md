# Daily Board beta

An original daily trivia prototype with a selectable category-and-points board. The working title is Daily Board.

## Play

Four columns (music, movies, countries, wildcard), three tiles each:

| Value | Items | Correct needed | Misses allowed |
| --- | --- | --- | --- |
| 100 | 2 | 1 | 1 |
| 200 | 3 | 2 | 1 |
| 300 | 4 | 3 | 1 |

The board has 36 items. Earn 1,200 out of 2,400 points to reach the goal; a perfect board needs 24 correct answers. There is no timer or forced order.

Music and movie titles use fill-in blanks; countries use matching; the wildcard asks for members of a finite set. Each category has a short introduction with an unscored example, displayed once per board and available through Rules. A second miss closes a tile. Blanks and places get one attempt each. Repeated set answers cost nothing. Correct matches remain recorded, and a wrong match leaves the chosen country available for another place.

Progress and acknowledged category rules are saved in the current browser. Results can be copied without answers. Give feedback copies a short feedback message for the player to send manually; it submits nothing to a server. Category browsing contains eight proposed families and forty theme ideas.

## Local development

Serve `docs` with a static HTTP server:

```sh
python3 -m http.server 4317 --bind 127.0.0.1 --directory docs
node --test tests/core.test.mjs
```

Open http://127.0.0.1:4317/. No build step, package install, external font, or third-party runtime dependency is required.

## Hosting and daily content

GitHub Pages can serve the HTML, CSS, JavaScript, and JSON directly. This repository serves files from `/docs` on `main`, using relative asset URLs and `.nojekyll`. Push an updated question bank to publish a new version.

This beta contains one fixed board. A future daily schedule can remain static: assign reviewed boards to ISO dates, choose one reset timezone, select the current board in the browser, and store progress by board ID. Maintain a content buffer and an archive. Scheduled GitHub Actions can publish additional files, or boards can be prepared in advance. No backend is required for casual daily play; trusted rankings or scores would require server validation.

Answer keys are downloadable because this is a static prototype. There are no accounts, leaderboard, analytics, or daily streaks. Difficulty and the goal need player feedback. The third row combines a higher target with harder content; its actual difficulty has not been measured.

Question wording and the interface are original. Facts have source links in `boards.json`, available after answer reveal. Daily Orbs and Jeopardy were studied for interaction patterns and concise category explanations; no question bank or visual assets were copied. Research notes are included in `research`.
