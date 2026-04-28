import * as migration_20260422_060548 from './20260422_060548';
import * as migration_20260422_091515 from './20260422_091515';
import * as migration_20260428_163759_proposals from './20260428_163759_proposals';

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
    name: '20260428_163759_proposals'
  },
];
