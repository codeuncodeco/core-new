import * as migration_20260422_060548 from './20260422_060548';
import * as migration_20260422_091515 from './20260422_091515';
import * as migration_20260428_163759_proposals from './20260428_163759_proposals';
import * as migration_20260428_165255_proposals_admin_tweaks from './20260428_165255_proposals_admin_tweaks';
import * as migration_20260428_170533 from './20260428_170533';
import * as migration_20260428_182235 from './20260428_182235';
import * as migration_20260428_183251_engagements_tasks from './20260428_183251_engagements_tasks';

export const migrations = [
  {
    up: migration_20260422_060548.up,
    down: migration_20260422_060548.down,
    name: '20260422_060548',
  },
  {
    up: migration_20260422_091515.up,
    down: migration_20260422_091515.down,
    name: '20260422_091515',
  },
  {
    up: migration_20260428_163759_proposals.up,
    down: migration_20260428_163759_proposals.down,
    name: '20260428_163759_proposals',
  },
  {
    up: migration_20260428_165255_proposals_admin_tweaks.up,
    down: migration_20260428_165255_proposals_admin_tweaks.down,
    name: '20260428_165255_proposals_admin_tweaks',
  },
  {
    up: migration_20260428_170533.up,
    down: migration_20260428_170533.down,
    name: '20260428_170533',
  },
  {
    up: migration_20260428_182235.up,
    down: migration_20260428_182235.down,
    name: '20260428_182235',
  },
  {
    up: migration_20260428_183251_engagements_tasks.up,
    down: migration_20260428_183251_engagements_tasks.down,
    name: '20260428_183251_engagements_tasks'
  },
];
