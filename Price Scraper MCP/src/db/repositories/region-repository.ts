import type pg from 'pg';
import type { Region, RegionName } from '../../types/region.js';

export class RegionRepository {
  constructor(private pool: pg.Pool) {}

  async findByName(name: RegionName): Promise<Region | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM regions WHERE name = $1',
      [name],
    );
    return rows[0] ?? null;
  }

  async listAll(): Promise<Region[]> {
    const { rows } = await this.pool.query('SELECT * FROM regions ORDER BY name');
    return rows;
  }
}
