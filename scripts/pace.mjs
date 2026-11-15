// One request pacer for every platform the data is published to (Zenodo, Dataverse, HDX, Wikimedia Commons, the
// site downloads). Owner, 15 November 2026: "pace the uploads (for all platforms)", after the 14 November Zenodo run
// hit "133 per 1 minute" (HTTP 429) and failed for the Philippines and Indonesia.
//
// pacer(gapMs) returns a fetch that waits so two calls are never closer than gapMs, and retries an HTTP 429 or 5xx
// answer (and a network error) after the server's Retry-After, or 15 s, 30 s, 45 s ..., up to `retries` times.
// A request body must be reusable (string, Buffer, Blob, FormData): it is sent again on a retry.
export const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

export function pacer(gapMs, { retries = 6, label = 'request' } = {}) {
  let last = 0;
  return async function pacedFetch(url, opts = {}) {
    for (let attempt = 0; ; attempt++) {
      const wait = last + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      let r;
      try {
        r = await fetch(url, opts);
      } catch (e) {
        if (attempt >= retries) throw e;
        const pause = 15000 * (attempt + 1);
        console.log(`${label} ${String(url).split('?')[0]}: ${e.message}, retrying in ${pause / 1000} s`);
        await sleep(pause);
        continue;
      }
      if ((r.status === 429 || r.status >= 500) && attempt < retries) {
        const after = Number(r.headers.get('retry-after'));
        const pause = Number.isFinite(after) && after > 0 ? after * 1000 : 15000 * (attempt + 1);
        console.log(`${label} ${String(url).split('?')[0]}: HTTP ${r.status}, retrying in ${Math.round(pause / 1000)} s`);
        await r.text().catch(() => null);
        await sleep(pause);
        continue;
      }
      return r;
    }
  };
}
