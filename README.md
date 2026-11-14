---
license: other
license_name: cc-by-4.0-and-odbl-1.0
license_link: https://github.com/laosbustickets/southeast-asia-transport-data#licences
pretty_name: Southeast Asia Transport Data
language:
- en
- fr
- de
- es
- ja
- ko
- ru
- zh
tags:
- laos
- thailand
- vietnam
- cambodia
- philippines
- indonesia
- southeast-asia
- transport
- border-crossings
- railway
- bus-routes
- ferries
- maps
- geojson
configs:
- config_name: laos_border_checkpoints
  data_files: laos/checkpoints.csv
- config_name: laos_routes
  data_files: laos/routes.csv
- config_name: vietnam_border_crossings
  data_files: vietnam/vietnam-border-crossings.csv
- config_name: cambodia_border_crossings
  data_files: cambodia/cambodia-border-crossings.csv
- config_name: thailand_places
  data_files: thailand/thailand-transport-map-places.csv
- config_name: philippines_ferry_routes
  data_files: philippines/philippines-ferry-routes.csv
- config_name: philippines_places
  data_files: philippines/philippines-transit-places.csv
- config_name: indonesia_routes
  data_files: indonesia/indonesia-transport-routes.csv
- config_name: indonesia_places
  data_files: indonesia/indonesia-transit-places.csv
---

# Southeast Asia Transport Data

Open data from six independent travel guides to Southeast Asia (Laos, Thailand, Vietnam, Cambodia,
the Philippines and Indonesia): border crossings with their visa status and sources, routes and timetables,
inter-island ferry routes, and each country's transport map as data
and as images in eight languages. **Each website is the original source**; this repository is a
copy, synced every night by a GitHub Action, and mirrored to
[Hugging Face](https://huggingface.co/datasets/laosbustickets/southeast-asia-transport-data) and
[Kaggle](https://www.kaggle.com/datasets/seatransport/southeast-asia-transport-data) (refreshed daily from here).
If a copy and its website ever differ, trust the website, and cite its pages.

| Folder | Website | Files | Licence | Archived on Zenodo (all versions) | Harvard Dataverse |
|---|---|---|---|---|---|
| `laos/` | [Laos Bus Tickets](https://laosbustickets.com/sources/#open-data) | Border checkpoints register and bus, train and flight routes (JSON, CSV), Laos–China Railway timetable (next 7 days), transport map (SVG) | CC BY 4.0 | [10.5281/zenodo.23751855](https://doi.org/10.5281/zenodo.23751855) | [10.7910/DVN/SMS3IB](https://doi.org/10.7910/DVN/SMS3IB) |
| `thailand/` | [Thailand Transport Hub](https://thailandtransporthub.com/about/#open-data) | Places with coordinates (CSV, JSON, GeoJSON), rail, road and ferry corridors, transport map (SVG, PNG) | ODbL 1.0 (data), CC BY 4.0 (map images) | [10.5281/zenodo.23751896](https://doi.org/10.5281/zenodo.23751896) | [10.7910/DVN/O83O47](https://doi.org/10.7910/DVN/O83O47) |
| `vietnam/` | [Vietnam Transport Guide](https://vietnamtransportguide.com/about/#open-data) | Land border crossings with China, Laos and Cambodia (CSV, JSON), map GeoJSON, transport map (SVG) | ODbL 1.0 | [10.5281/zenodo.23751898](https://doi.org/10.5281/zenodo.23751898) | [10.7910/DVN/PWPXB7](https://doi.org/10.7910/DVN/PWPXB7) |
| `cambodia/` | [Cambodia Transport Guide](https://cambodiatransportguide.com/about/#open-data) | Border crossings with Vietnam, Laos and Thailand (CSV, JSON), map GeoJSON, transport map (SVG) | ODbL 1.0 | [10.5281/zenodo.23751900](https://doi.org/10.5281/zenodo.23751900) | [10.7910/DVN/FTWHFF](https://doi.org/10.7910/DVN/FTWHFF) |
| `philippines/` | [Philippines Transport](https://philippinestransport.com/about/#open-data) | Inter-island ferry routes, port to port (CSV, JSON), ports, towns and airports with coordinates (CSV, JSON, GeoJSON with the bus and ferry lines), transport map (SVG) | ODbL 1.0 (data), CC BY 4.0 (map images) | [10.5281/zenodo.23830271](https://doi.org/10.5281/zenodo.23830271) | [10.7910/DVN/JFGSYE](https://doi.org/10.7910/DVN/JFGSYE) |
| `indonesia/` | [Indonesia Transport](https://indonesiatransport.com/indonesia-transport-map/#data-desk) | Train, ferry and fast-boat routes (CSV, JSON), towns, ports, stations and airports with coordinates (CSV, JSON, GeoJSON), transport map (SVG) | ODbL 1.0 (data), CC BY 4.0 (map images) | [10.5281/zenodo.24192836](https://doi.org/10.5281/zenodo.24192836) | [10.7910/DVN/1EU33Q](https://doi.org/10.7910/DVN/1EU33Q) |

Map images sit in each country's `maps/` folder, one per language (en, fr, de, es, ja, ko, ru,
zh). `datasets.json` lists every file with the address it is copied from.

## Updates

- **Every night** (02:37 UTC): every file is copied from its website; only real changes are
  committed.
- **Every Saturday** (04:17 UTC): a new Zenodo version is archived for each country whose files
  changed that week. The Laos train timetable changes every morning and is archived with each
  new version, but never triggers one on its own.
- **Every Saturday** (04:47 UTC): the same check for Harvard Dataverse, where each country has a
  dataset in the [Southeast Asia Transport Data](https://dataverse.harvard.edu/dataverse/southeast-asia-transport)
  collection; a new version is published only when a file changed.

All the sites' collection: [Southeast Asia Transport Open Data on Zenodo](https://zenodo.org/communities/sea-transport-open-data/).

## Licences

- **Laos**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit "Laos Bus Tickets
  (laosbustickets.com)". Checkpoint positions from OpenStreetMap.
- **Thailand**: data files under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/),
  map images under CC BY 4.0. Credit "Thailand Transport Hub (thailandtransporthub.com)"; the
  sources' own terms are in `thailand/LICENSE.txt`.
- **Vietnam** and **Cambodia**: [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/),
  positions © OpenStreetMap contributors. Credit "Vietnam Transport Guide
  (vietnamtransportguide.com)" or "Cambodia Transport Guide (cambodiatransportguide.com)".
- **Philippines**: data files under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/),
  positions © OpenStreetMap contributors; map images under CC BY 4.0. Credit "Philippines Transport
  (philippinestransport.com)".
- **Indonesia**: data files under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/),
  positions © OpenStreetMap contributors; map images under CC BY 4.0. Credit "Indonesia Transport
  (indonesiatransport.com)".

## Citation

Cite the website page for the data you use, or, for a permanent reference, the country's Zenodo
DOI above. For example: Vietnam Transport Guide, "Vietnam border crossings",
https://vietnamtransportguide.com/vietnam-transport-map/, doi:10.5281/zenodo.23751898.
