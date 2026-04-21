export type SeedPartner = {
  name: string
  tagline: string
  href: string
  icon: string
  displayOrder: number
}

export const allSeedPartners: SeedPartner[] = [
  {
    name: 'Malkum',
    tagline: 'Brand and interface craft.',
    href: 'https://www.malkum.com/',
    icon: 'palette',
    displayOrder: 10,
  },
  {
    name: 'Absurd Industries',
    tagline: 'Playful R&D and hardware hacks.',
    href: 'https://absurd.industries/',
    icon: 'wrench',
    displayOrder: 20,
  },
  {
    name: 'Mayur Tekchandani',
    tagline: 'Illustration and visual design.',
    href: 'https://www.behance.net/mayurtek',
    icon: 'eye',
    displayOrder: 30,
  },
  {
    name: 'Paresh Suvarna',
    tagline: 'Motion, type, and art direction.',
    href: 'https://www.behance.net/paresh_suvarna',
    icon: 'pencil',
    displayOrder: 40,
  },
]
