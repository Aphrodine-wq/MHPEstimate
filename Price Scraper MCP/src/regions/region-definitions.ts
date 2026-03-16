import type { Region, RegionName } from '../types/region.js';

export const REGIONS: Record<RegionName, Region> = {
  northeast: {
    name: 'northeast',
    display_name: 'Northeast',
    zip_codes: ['10001', '02101', '19103', '06103', '07102'],
  },
  southeast: {
    name: 'southeast',
    display_name: 'Southeast',
    zip_codes: ['30301', '33101', '27601', '28201', '32801'],
  },
  midwest: {
    name: 'midwest',
    display_name: 'Midwest',
    zip_codes: ['60601', '48201', '43215', '55401', '63101'],
  },
  south: {
    name: 'south',
    display_name: 'South',
    zip_codes: ['75201', '77001', '37201', '70112', '73101'],
  },
  west: {
    name: 'west',
    display_name: 'West',
    zip_codes: ['80201', '85001', '84101', '87101', '89101'],
  },
  pacific: {
    name: 'pacific',
    display_name: 'Pacific',
    zip_codes: ['90001', '94102', '97201', '98101', '96801'],
  },
};

export function getRegionByName(name: RegionName): Region {
  return REGIONS[name];
}

export function getAllRegions(): Region[] {
  return Object.values(REGIONS);
}
