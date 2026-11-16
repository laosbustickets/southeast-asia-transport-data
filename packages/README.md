# Southeast Asia Transport Data

Open transport data for six countries of Southeast Asia, as JSON, CSV and GeoJSON: border crossings with their
visa status and sources, bus, train and ferry routes, the Laos train timetable, and the places on each country's
transport map. Each country's files come from an independent travel guide that publishes and maintains them; the
guide's website is the original source.

A new version of `@seatransport/data` is published automatically when the data changes (checked every Saturday), and
`loadLatest` reads the current copy from GitHub, which is synced from the websites every night.

## Countries and files

| Country | Website (original source) | Files | Licence | Archive |
|---|---|---|---|---|
| `laos` | [laosbustickets.com](https://laosbustickets.com/) | border checkpoints, routes, train timetable | CC BY 4.0 | [10.5281/zenodo.23751855](https://doi.org/10.5281/zenodo.23751855) |
| `thailand` | [thailandtransporthub.com](https://thailandtransporthub.com/) | transport-map places and links | ODbL 1.0 | [10.5281/zenodo.23751896](https://doi.org/10.5281/zenodo.23751896) |
| `vietnam` | [vietnamtransportguide.com](https://vietnamtransportguide.com/) | border crossings, transport map | ODbL 1.0 | [10.5281/zenodo.23751898](https://doi.org/10.5281/zenodo.23751898) |
| `cambodia` | [cambodiatransportguide.com](https://cambodiatransportguide.com/) | border crossings, transport map | ODbL 1.0 | [10.5281/zenodo.23751900](https://doi.org/10.5281/zenodo.23751900) |
| `philippines` | [philippinestransport.com](https://philippinestransport.com/) | ferry routes, ports and transit places | ODbL 1.0 | [10.5281/zenodo.23830271](https://doi.org/10.5281/zenodo.23830271) |
| `indonesia` | [indonesiatransport.com](https://indonesiatransport.com/) | routes, ports and transit places | ODbL 1.0 | [10.5281/zenodo.24192836](https://doi.org/10.5281/zenodo.24192836) |

`files(country)` lists the exact file names. Every version of every country is archived in the Zenodo community
[sea-transport-open-data](https://zenodo.org/communities/sea-transport-open-data/).

## JavaScript (Node 18+)

```sh
npm install @seatransport/data
```

```js
import { countries, files, load, path, loadLatest } from '@seatransport/data';

countries();                                   // ['laos', 'thailand', 'vietnam', 'cambodia', 'philippines', 'indonesia']
const checkpoints = load('laos', 'checkpoints.json');            // parsed JSON
const ferries = load('philippines', 'philippines-ferry-routes.csv'); // CSV text
path('vietnam', 'vietnam-transport-map.geo.json');               // absolute path, for a map library
const today = await loadLatest('laos', 'laos-train-timetable.json'); // current copy from GitHub
```

CommonJS works too: `const sea = require('@seatransport/data')`. From Python or any other language, read the same
files from the GitHub repository below or its [Hugging Face copy](https://huggingface.co/datasets/laosbustickets/southeast-asia-transport-data).

## Credit

Laos is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the other countries' data files are
under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (the Thailand folder's
`LICENSE.txt` gives its sources' terms). Credit the country's website and its DOI, for example: "Data: Laos Bus
Tickets (laosbustickets.com), doi:10.5281/zenodo.23751855". Fares and timetables are dated examples, not live
prices; check the website before you travel.

Source, issues and the full dataset (maps in eight languages included):
[github.com/laosbustickets/southeast-asia-transport-data](https://github.com/laosbustickets/southeast-asia-transport-data).
