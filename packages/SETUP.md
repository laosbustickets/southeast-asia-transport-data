# The npm and PyPI packages (owner hand-off, 16 and 17 November 2026)

`@seatransport/data` (npm) and `sea-transport-data` (PyPI) are built and published by the GitHub Action
`.github/workflows/packages.yml` in `laosbustickets/southeast-asia-transport-data`, every Saturday at 05:17 UTC, only
when the data changed. The npm account is `seatransport` (the package's scope is the account itself; no organization
is needed). PyPI was dropped on 16 November 2026 and brought back by the owner on 17 November 2026 ("yes lets add
it"): its project page links the six websites (`project.urls` in `python/pyproject.toml`).

Accounts, passwords and tokens are the owner's to create; an agent never types them.

## PyPI (17 November 2026): trusted publishing, no token

PyPI's two-factor login is for the website only; the workflow publishes with GitHub's OIDC token, so no password,
token or 2FA code is stored anywhere. The trusted publisher on PyPI (account **Publishing**): project
`sea-transport-data`, owner `laosbustickets`, repository `southeast-asia-transport-data`, workflow `packages.yml`,
environment `pypi`. The job `pypi` runs after the job `npm` and records its release in `published.json` the same way.

## Done on 16 November 2026

- npm granular token `github-southeast-asia-transport-data` (read and write, all packages, expires 14 February 2027)
  saved in GitHub as the secret `NPM_TOKEN`.
- npm profile name "Southeast Asia Transport".

## Before 14 February 2027: switch to trusted publishing (no token)

1. Open https://www.npmjs.com/package/@seatransport/data → **Settings** → **Trusted Publisher** → **GitHub Actions**:
   user `laosbustickets`, repository `southeast-asia-transport-data`, workflow filename `packages.yml`, environment
   empty. Save.
2. GitHub repository → **Settings** → **Secrets and variables** → **Actions** → tab **Variables** → **New repository
   variable**: `NPM_TRUSTED` = `true`.
3. Delete the secret `NPM_TOKEN` in GitHub and the token on npm (**Access Tokens**). No code change is needed.

Recommended: turn on two-factor authentication on the npm account (**Account** → **Enable 2FA**).

## Publishing by hand

GitHub → **Actions** → **Publish the npm and PyPI packages** → **Run workflow**. With **dry_run** ticked (the default) it
builds and checks the package and publishes nothing; untick it to publish now (only if the data changed since the last
release, or tick **force**).

## If a run fails

GitHub sends an email. Open the run under **Actions**:

- **Build and check**: a data file is missing in the repository (the nightly sync failed: check "Sync data from the
  websites") or a package file was edited badly.
- **Publish**: the token expired or lost its rights (make a new one, or finish the trusted-publishing switch above).

Nothing is lost when a run fails: the next Saturday (or a manual run) publishes what is missing.
