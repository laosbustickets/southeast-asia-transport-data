export type Country = 'laos' | 'thailand' | 'vietnam' | 'cambodia' | 'philippines' | 'indonesia';

export interface CountryInfo {
  name: string;
  website: string;
  websiteName: string;
  dataPage: string;
  license: string;
  doi: string;
  files: string[];
}

export interface Catalogue {
  name: string;
  version: string;
  repository: string;
  latestBase: string;
  zenodoCommunity: string;
  dataHash: string;
  countries: Record<Country, CountryInfo>;
}

export const catalogue: Catalogue;
export function countries(): Country[];
export function files(country: Country): string[];
export function info(country: Country): CountryInfo;
export function path(country: Country, file: string): string;
/** Parsed JSON/GeoJSON for .json files, text for CSV, Markdown and licence files. */
export function load<T = unknown>(country: Country, file: string): T;
export function loadLatest<T = unknown>(country: Country, file: string): Promise<T>;

declare const _default: {
  catalogue: Catalogue;
  countries: typeof countries;
  files: typeof files;
  info: typeof info;
  path: typeof path;
  load: typeof load;
  loadLatest: typeof loadLatest;
};
export default _default;
