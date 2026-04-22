export type SeedCategory = {
  slug: string
  title: string
  blurb: string
  icon: string
  displayOrder: number
}

export const allSeedCategories: SeedCategory[] = [
  {
    slug: 'development',
    title: 'Develop',
    blurb: '',
    icon: 'code',
    displayOrder: 10,
  },
  {
    slug: 'design',
    title: 'Design',
    blurb: '',
    icon: 'design',
    displayOrder: 20,
  },
  {
    slug: 'ops',
    title: 'Deploy & Maintain',
    blurb: '',
    icon: 'database',
    displayOrder: 30,
  },
  {
    slug: 'marketing',
    title: 'Marketing',
    blurb: '',
    icon: 'heart',
    displayOrder: 40,
  },
]
