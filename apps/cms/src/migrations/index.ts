import * as migration_20260422_060548 from './20260422_060548';
import * as migration_20260422_091515 from './20260422_091515';

export const migrations = [
  {
    up: migration_20260422_060548.up,
    down: migration_20260422_060548.down,
    name: '20260422_060548',
  },
  {
    up: migration_20260422_091515.up,
    down: migration_20260422_091515.down,
    name: '20260422_091515'
  },
];
