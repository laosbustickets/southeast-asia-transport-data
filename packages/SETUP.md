# Setting up the npm and PyPI packages (owner hand-off, 16 November 2026)

The packages `@seatransport/data` (npm) and `sea-transport-data` (PyPI) are built and published by the GitHub
Action `.github/workflows/packages.yml` in `laosbustickets/southeast-asia-transport-data`, every Saturday at 05:17 UTC,
only when the data changed. Nothing is published until the steps below are done. Each registry works on its own:
if only npm is set up, only npm is published, and PyPI catches up once it is set up.

Accounts, passwords and tokens are the owner's to create; an agent never types them.

## 1. npm (about 5 minutes)

1. Sign in at https://www.npmjs.com (create the account if needed; turn on two-factor authentication).
2. Avatar → **Add Organization** → name `seatransport` → the free plan ("Unlimited public packages").
3. Avatar → **Access Tokens** → **Generate New Token** → **Granular Access Token**:
   - Name: `github-southeast-asia-transport-data`
   - Expiration: the longest offered
   - Permissions: **Read and write (publish and stage)**. The warning that it is revoked in January 2027 is expected:
     after the first release it is replaced by trusted publishing (step 4).
   - Select packages / scopes: the `@seatransport` organization (or "All packages" if the scope is not offered)
   - Allow it to publish without two-factor authentication if asked (GitHub cannot type a code).
   - **Generate**, copy the token (it is shown once).
4. **After the first version is on npm** (step 4 below): open https://www.npmjs.com/package/@seatransport/data →
   **Settings** → **Trusted Publisher** → **GitHub Actions**: organization or user `laosbustickets`, repository
   `southeast-asia-transport-data`, workflow filename `packages.yml`, environment `pypi`. Save. Then in GitHub add the
   variable `NPM_TRUSTED` = `true` (step 2.3), delete the secret `NPM_TOKEN`, and delete the token on npm. No code
   change is needed.

## 2. GitHub (about 3 minutes)

Repository https://github.com/laosbustickets/southeast-asia-transport-data → **Settings** → **Secrets and variables**
→ **Actions**:

1. Tab **Secrets** → **New repository secret**: name `NPM_TOKEN`, value the npm token. Save.
2. Tab **Variables** → **New repository variable**: name `PYPI_TRUSTED`, value `true` (after step 3 is done).
3. Later, for npm trusted publishing (step 1.4): variable `NPM_TRUSTED`, value `true`.

## 3. PyPI (about 3 minutes)

1. Sign in at https://pypi.org (create the account if needed; PyPI requires two-factor authentication).
2. Account menu → **Your projects** → **Publishing** → **Add a new pending publisher** → **GitHub**:
   - PyPI project name: `sea-transport-data`
   - Owner: `laosbustickets`
   - Repository name: `southeast-asia-transport-data`
   - Workflow name: `packages.yml`
   - Environment name: `pypi`
   - **Add**. No token is needed: GitHub proves who it is at each release.
3. Then add the GitHub variable `PYPI_TRUSTED` = `true` (step 2.2).

## 4. First release

GitHub → **Actions** → **Publish the npm and PyPI packages** → **Run workflow** → untick **dry_run** → **Run workflow**.
After 2 or 3 minutes:

- https://www.npmjs.com/package/@seatransport/data shows version `2026.11.<day>`
- https://pypi.org/project/sea-transport-data/ shows the same version
- the repository has a new commit "Packages … published" that adds `packages/published.json`

A run with **dry_run** ticked (the default for manual runs) builds and checks both packages and publishes nothing:
use it to test.

## 5. After the first release (agent)

- Add both package pages to `SharedData/data/authority-platforms.json` (not to any schema without the owner).
- Add a short "Packages" line to the repository README and to `SharedData/work/OPEN_DATA_BACKLINK_MANIFEST.md`.
- Check that `npm install @seatransport/data` and `pip install sea-transport-data` work and that `load()` returns data.

## If a run fails

GitHub sends an email. Open the run under **Actions**; the step name says which part failed:

- **Build and check**: a data file is missing in the repository (the nightly sync failed: check "Sync data from the
  websites") or a package file was edited badly.
- **npm**: token expired or missing rights (make a new token, step 1.3) or the trusted publisher does not match the
  workflow name and environment.
- **PyPI**: the pending publisher's fields do not match exactly (step 3.2).

Nothing is lost when a run fails: the next Saturday (or a manual run) publishes what is missing.
