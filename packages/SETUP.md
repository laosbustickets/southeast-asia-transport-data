# The npm package (owner hand-off, 16 November 2026)

`@seatransport/data` is built and published by the GitHub Action `.github/workflows/packages.yml` in
`laosbustickets/southeast-asia-transport-data`, every Saturday at 05:17 UTC, only when the data changed. The npm account
is `seatransport` (the package's scope is the account itself; no organization is needed). PyPI was dropped by the
owner on 16 November 2026.

Accounts, passwords and tokens are the owner's to create; an agent never types them.

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

GitHub → **Actions** → **Publish the npm package** → **Run workflow**. With **dry_run** ticked (the default) it
builds and checks the package and publishes nothing; untick it to publish now (only if the data changed since the last
release, or tick **force**).

## If a run fails

GitHub sends an email. Open the run under **Actions**:

- **Build and check**: a data file is missing in the repository (the nightly sync failed: check "Sync data from the
  websites") or a package file was edited badly.
- **Publish**: the token expired or lost its rights (make a new one, or finish the trusted-publishing switch above).

Nothing is lost when a run fails: the next Saturday (or a manual run) publishes what is missing.
