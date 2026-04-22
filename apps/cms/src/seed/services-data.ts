import type { Service } from '../payload-types'
import type { IconName } from '../shared/icons'

type Price = NonNullable<Service['prices']>[number]

export type SeedService = {
  title: string
  slug: string
  categorySlug: string
  tagSlugs?: string[]
  flagship?: boolean
  icon?: IconName
  summary?: string
  prices: Price[]
  inclusions?: { item: string }[]
  exclusions?: { item: string }[]
  displayOrder: number
}

const p = (amount: number, rest: Partial<Price> = {}): Price => ({ amount, ...rest }) as Price
const items = (strs: string[]) => strs.map((item) => ({ item }))

export const allSeedServices: SeedService[] = [
  // ---------- DESIGN ----------
  {
    title: 'Interface Design',
    slug: 'ui',
    categorySlug: 'design',
    tagSlugs: ['figma'],
    flagship: true,
    icon: 'sliders',
    summary: 'Upto five screens, tested and perfected for all screen sizes!',
    prices: [p(125000)],
    inclusions: items([
      'Low-fidelity wireframe design',
      'Layout placement for content & CTAs',
      'High-fidelity design with branding and visuals',
    ]),
    displayOrder: 20,
  },
  {
    title: 'User Experience',
    slug: 'ux',
    categorySlug: 'design',
    icon: 'wand-magic-sparkles',
    summary: 'Create joyful experiences that delight your visitors!',
    prices: [p(150000)],
    displayOrder: 0,
  },
  {
    title: 'Pitch Deck Design',
    slug: 'presentation-design',
    categorySlug: 'design',
    tagSlugs: ['social', 'branding'],
    icon: 'rectangle',
    summary: 'A deck that looks the part.',
    prices: [p(25000, { suffix: 'per 5 slides' })],
    displayOrder: 120,
  },

  // ---------- DEVELOPMENT ----------
  {
    title: 'Website with CMS',
    slug: 'web-development',
    categorySlug: 'development',
    tagSlugs: ['astro', 'payload', 'typescript', 'tailwind', 'cms'],
    flagship: true,
    icon: 'at',
    summary:
      'Everything in handcrafted website and you can update it yourself with an intuitive dashboard.',
    prices: [p(300000)],
    inclusions: items(['Responsive layouts, mobile-first', 'PayloadCMS integration']),
    displayOrder: 0,
  },
  {
    title: 'Handcrafted Website',
    slug: 'website',
    categorySlug: 'development',
    tagSlugs: ['astro'],
    icon: 'palette',
    summary: 'Highly useable, beautiful website for your idea, brand, product or service.',
    prices: [p(150000)],
    displayOrder: 1,
  },
  {
    title: 'Landing Page',
    slug: 'landing',
    categorySlug: 'development',
    tagSlugs: ['astro'],
    icon: 'newspaper',
    summary: 'Rich long, single page for a product or service with curated media.',
    prices: [p(225000)],
    displayOrder: 3,
  },
  {
    title: 'Shop',
    slug: 'shop',
    categorySlug: 'development',
    tagSlugs: ['shopify'],
    icon: 'cart-shopping',
    summary: 'Shopify storefront with essentials to sell ASAP!',
    prices: [
      p(250000, { label: 'UI/UX Design + Development' }),
      p(25000, { label: 'Development only' }),
    ],
    displayOrder: 4,
  },

  // ---------- OPS (Deploy & Maintain) ----------
  {
    title: 'Deployment',
    slug: 'deployment',
    categorySlug: 'ops',
    tagSlugs: ['cloudflare'],
    flagship: true,
    icon: 'database',
    summary: 'Databases, SSL, backups, and all on your domain.',
    prices: [p(60000)],
    inclusions: items([
      'Server configuration on Vercel / AWS / Cloudflare',
      'Testing & optimization (performance, page load, cross-device/browser)',
      'Migration with redirects from old site',
      'Bug fixes',
    ]),
    displayOrder: 10,
  },
  {
    title: 'Keep the site alive',
    slug: 'monthly-maintenance',
    categorySlug: 'ops',
    tagSlugs: ['maintenance'],
    icon: 'person-biking',
    summary: 'We handle updates, uptime, and small fixes.',
    prices: [p(20000, { suffix: 'per month' })],
    inclusions: items([
      'Dependency + security updates',
      'Uptime monitoring',
      'Small fixes and copy changes',
      'Quarterly health report',
    ]),
    displayOrder: 20,
  },

  // ---------- MARKETING ----------
  {
    title: 'Run campaigns',
    slug: 'ads',
    categorySlug: 'marketing',
    icon: 'paper-plane',
    summary: 'Help spread the word on socials, search engines and LLMs.',
    prices: [p(25000, { suffix: 'per month' })],
    displayOrder: 0,
  },
  {
    title: 'Media Library',
    slug: 'media',
    categorySlug: 'marketing',
    icon: 'images',
    summary: 'Photography/videography with editing for creating a media library.',
    prices: [p(40000)],
    displayOrder: 0,
  },
]
