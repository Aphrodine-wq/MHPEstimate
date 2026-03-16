export type RegionName = 'northeast' | 'southeast' | 'midwest' | 'south' | 'west' | 'pacific';

export interface Region {
  name: RegionName;
  display_name: string;
  zip_codes: string[];
}
