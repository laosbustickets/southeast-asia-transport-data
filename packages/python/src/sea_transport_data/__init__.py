"""sea-transport-data: the files bundled at publish time, and the latest copy from GitHub on request."""
from __future__ import annotations

import json
import urllib.request
from importlib import resources
from pathlib import Path
from typing import Any, Dict, List

__all__ = ["catalogue", "countries", "files", "info", "path", "load", "load_latest"]

_DATA = resources.files(__package__).joinpath("data")
catalogue: Dict[str, Any] = json.loads(_DATA.joinpath("catalogue.json").read_text(encoding="utf-8"))
__version__: str = catalogue["version"]


def _check(country: str, file: str | None = None) -> Dict[str, Any]:
    c = catalogue["countries"].get(country)
    if c is None:
        raise KeyError(f'Unknown country "{country}". Use one of: {", ".join(catalogue["countries"])}')
    if file is not None and file not in c["files"]:
        raise KeyError(f'"{file}" is not in {country}. Files: {", ".join(c["files"])}')
    return c


def _parse(file: str, text: str) -> Any:
    return json.loads(text) if file.endswith(".json") or file.endswith(".geojson") else text


def countries() -> List[str]:
    """Country ids: laos, thailand, vietnam, cambodia, philippines, indonesia."""
    return list(catalogue["countries"])


def files(country: str) -> List[str]:
    """The files a country holds, e.g. files("laos") -> ["README.md", "checkpoints.json", ...]."""
    return list(_check(country)["files"])


def info(country: str) -> Dict[str, Any]:
    """Website, licence, DOI and files of one country."""
    return dict(_check(country))


def path(country: str, file: str) -> Path:
    """Path of a bundled file (for pandas.read_csv, geopandas.read_file and the like)."""
    _check(country, file)
    return Path(str(_DATA.joinpath(country, file)))


def load(country: str, file: str) -> Any:
    """A bundled file: parsed JSON or GeoJSON, or the text of a CSV, Markdown or licence file."""
    return _parse(file, path(country, file).read_text(encoding="utf-8"))


def load_latest(country: str, file: str, timeout: float = 30) -> Any:
    """The same file as it is on GitHub now (synced every night from the websites). Needs network access."""
    _check(country, file)
    url = f'{catalogue["latestBase"]}{country}/{file}'
    req = urllib.request.Request(url, headers={"User-Agent": f"sea-transport-data/{__version__}"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return _parse(file, r.read().decode("utf-8"))
