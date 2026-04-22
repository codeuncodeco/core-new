import type { Project } from '../payload-types'

type SeedProject = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'cover'> & {
  cover?: never
}

export const allSeedProjects: SeedProject[] = [
  {
    title: 'Mecha Comet',
    slug: 'mecha-comet',
    client: 'Mecha',
    summary: 'Website, socials and video for Mecha Comet after their $1.1M Kickstarter.',
    url: 'https://mecha.so/comet',
    tags: ['web', 'socials', 'community'],
    featured: true,
    displayOrder: 10,
  },
  {
    title: 'Caffeinated',
    slug: 'caffeinated',
    client: 'Caffeinated',
    summary: 'Shopify store with motion design and custom development. Collaboration with Bharat.',
    url: 'https://www.caffeinated.co.in/',
    tags: ['shopify', 'motion', 'ecommerce'],
    featured: true,
    displayOrder: 20,
  },

  // Landing pages
  {
    title: 'Supervillains',
    slug: 'supervillains',
    summary: 'Landing page.',
    url: 'https://supervillains.wtf/',
    tags: ['landing-page'],
    displayOrder: 100,
  },
  {
    title: 'Ascencus',
    slug: 'ascencus',
    summary: 'Landing page.',
    url: 'https://ascencus.absurd.industries/',
    tags: ['landing-page'],
    displayOrder: 110,
  },
  {
    title: 'Swiggy Moments',
    slug: 'swiggy-moments',
    client: 'Swiggy',
    summary: 'Gift happiness to your employees and customers through Swiggy for businesses.',
    url: 'https://moments.swiggy.com/',
    tags: ['landing-page'],
    displayOrder: 120,
  },

  // Site / CMS development
  {
    title: 'Rooshad Shroff',
    slug: 'rooshad-shroff',
    client: 'Rooshad Shroff',
    summary: 'Portfolio site with CMS.',
    url: 'https://rooshadshroff.com/',
    tags: ['web', 'cms', 'portfolio'],
    displayOrder: 200,
  },
  {
    title: 'Hot Planet',
    slug: 'hot-planet',
    summary: 'Design of E-Commerce',
    url: 'https://www.hotplanet.in/',
    tags: ['web', 'e-commerce'],
    displayOrder: 210,
  },
  {
    title: 'ISROnaut',
    slug: 'isronaut',
    summary: 'Design & Site development.',
    url: 'https://isronaut.com/',
    tags: ['web'],
    displayOrder: 220,
  },
  {
    title: 'sm0l.dev',
    slug: 'sm0l-dev',
    summary: 'Personal dev site.',
    url: 'https://sm0l.dev/',
    tags: ['web', 'personal'],
    displayOrder: 230,
  },

  // Progressive Web Apps
  {
    title: 'Standard Designs and Estimates',
    slug: 'washi-sde',
    client: 'WASH Institute',
    summary:
      'Drawings and bills of quantities for UWM infrastructure to support tendering processes',
    url: 'https://sde.washinstitute.org/',
    tags: ['pwa', 'education'],
    displayOrder: 300,
  },
  {
    title: 'Arcade',
    slug: 'arcade',
    summary: 'Progressive web app.',
    url: 'https://arcade.sm0l.dev/',
    tags: ['pwa', 'games'],
    displayOrder: 310,
  },
  {
    title: 'Seed Valley',
    slug: 'seed-valley',
    summary: 'Progressive web app for growing food in your balcony.',
    url: 'https://seeds.layogtima.com/',
    tags: ['pwa'],
    displayOrder: 320,
  },

  // Visualization
  {
    title: '3D Explorations',
    slug: '3d-explorations',
    summary: 'Interactive 3D visualizations.',
    url: 'https://3d.layogtima.com/',
    tags: ['visualization', '3d', 'webgl'],
    displayOrder: 400,
  },
  {
    title: 'Bombay Shirt Company - Shirt Designer',
    slug: 'bombay-shirts-designer',
    client: 'Bombay Shirt Company',
    summary: 'Interactive shirt customizer. Open the product page and click "Edit Design".',
    url: 'https://www.bombayshirts.com/products/bsc-giza-cotton-houndstooth-shirt-light-grey',
    tags: ['visualization', 'ecommerce', 'configurator'],
    displayOrder: 410,
  },

  // Other
  {
    title: 'Flowrish',
    slug: 'flowrish',
    client: 'Flowrish',
    summary: 'Wellness that adapts to the changing demands of your life.',
    url: 'https://flowrish.co/',
    tags: [],
    displayOrder: 0,
  },
  {
    title: 'Absurd',
    slug: 'absurd-industries',
    summary: 'Making science and technology a whole lot more fun',
    url: 'https://absurd.industries/',
    tags: [],
    displayOrder: 0,
  },
]
