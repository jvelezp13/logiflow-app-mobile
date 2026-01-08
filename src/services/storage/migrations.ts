/**
 * WatermelonDB Migrations
 *
 * Database schema migrations for version updates.
 */

import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Migration from v1 to v2: Add kiosk_pin field
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'attendance_records',
          columns: [
            { name: 'kiosk_pin', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    // Migration from v2 to v3: Add fuente and remote_updated_at for admin edit tracking
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'attendance_records',
          columns: [
            { name: 'fuente', type: 'string', isOptional: true },
            { name: 'remote_updated_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
