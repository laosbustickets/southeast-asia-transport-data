# Laos Bus Tickets, open data

Verified 2026-10-25 (checkpoints.json) and 2026-10-21 (routes.json). The files here are exactly what this site's own pages
are generated from, republished as-is so they can be linked to, diffed over time, or
used directly rather than scraped. Both JSON files carry schema.org Dataset markup on
their own canonical page (/laos-border-checkpoints/ and /routes/ respectively), and
checkpoints.json additionally carries a per-checkpoint `verified` date, not just one
file-level date, since not every checkpoint is necessarily re-confirmed in the same pass.

- `checkpoints.json`: every official Laos border checkpoint this site tracks, with hours,
  visa-on-arrival and eVisa status (official register plus, where it conflicts, what
  travellers report), geo coordinates, alternate names and a per-checkpoint verified date.
- `routes.json`: every bus, train and flight route this site checks against live booking
  inventory, with the border crossing used, duration, indicative fare and whether it is
  bookable online.
- `checkpoints.csv` and `routes.csv`: the same two lists as flat tables, one row per
  checkpoint and per route, for spreadsheets. The JSON files hold the full details.
- `laos-train-timetable.json`: every passenger train on the Laos–China Railway for the next
  seven days (stations, times, running days, through trains to Kunming), refreshed every
  morning at 06:00 Laos time from the official LCR Ticket app. Canonical page:
  https://laosbustickets.com/train-tickets-laos/#timetable
- `laos-transport-map-<lang>.svg` (and `-landscape.svg`): the Laos transport map in eight
  languages, redrawn from the two JSON files above. Canonical page:
  https://laosbustickets.com/laos-transport-map/
- `checkpoint-badge.svg`: a small embeddable badge showing the checkpoint count and the
  register's last-verified date, for linking back to /laos-border-checkpoints/ from a
  blog post or another site. Regenerated on every build from the same `_meta` block.

Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Please credit
"Laos Bus Tickets (laosbustickets.com)" and link to the canonical page:
https://laosbustickets.com/laos-border-checkpoints/ for checkpoints.json, or
https://laosbustickets.com/routes/ for routes.json. Suggested citation:
Laos Bus Tickets, "Laos Border Checkpoints Register", verified 2026-10-25,
https://laosbustickets.com/laos-border-checkpoints/.
In routes.json, bookingUrl and reverseBookingUrl are this site's own booking redirects
(affiliate links; see https://laosbustickets.com/affiliate-disclosure/), and every
cross-border route carries checkpointRegisterUrl, the official Lao register page for the
crossing it uses. checkpoints.json and routes.json change when the facts they describe
change; the timetable changes every morning.

You can also download the same files from GitHub (https://github.com/laosbustickets/laos-transport-data)
or Hugging Face (https://huggingface.co/datasets/laosbustickets/laos-transport-data), refreshed there every day.
To cite the data or the map in a report or article, use their permanent link on Zenodo:
https://doi.org/10.5281/zenodo.23751855 (it always opens the newest version).
