import type { Client } from '../payload-types'

type SeedClient = Omit<
  Client,
  'id' | 'createdAt' | 'updatedAt' | 'logo' | 'notes'
>

export const allSeedClients: SeedClient[] = [
  {
    name: 'Consultway Infotech',
    tagline: 'Project Management Consultancy for Infrastructure & Solar',
    status: 'prospect',
  },
]
