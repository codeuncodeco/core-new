import type { Proposal } from '../payload-types'

// Mirror the existing quotes/consultway/proposal-a.html as the canonical
// example. The seed creates this in `draft` status so it doesn't pretend
// to be a real, sent proposal.
type SeedProposal = Omit<
  Proposal,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'client'
  | 'attachedPdf'
  | 'duplicateAction'
> & {
  // Resolved at seed time against allSeedClients[].name.
  clientName: string
}

export const allSeedProposals: SeedProposal[] = [
  {
    clientName: 'Consultway Infotech',
    internalTitle: 'Consultway — Proposal A',
    urlSlug: 'consultway-proposal-a',
    projectName: 'Consultway Infotech',
    subtitle: 'Companies, Tender & Project Management Platform',
    accentColor: '#f97316',
    fontFamily: 'League Spartan',
    proposalDate: '2026-03-06',
    overview:
      'A custom web platform for Consultway Infotech to digitize company onboarding, tender management, project tracking, transactions, and invoicing - replacing Excel sheets, WhatsApp, email, and phone-based coordination with a unified system. Companies can self-register, upload documents, and stay compliant, while Consultway manages tenders, tracks projects, records transactions, and issues invoices from one place.',
    summaryCards: [
      { label: 'Timeline', value: '10–12 Weeks', caption: 'Design through launch' },
      { label: 'Total Cost', value: '₹12,50,000', caption: '+18% GST' },
    ],
    scopeItems: [
      {
        title: 'Authentication & Role Management',
        description:
          'Login system with role-based access for Admins, Consultway staff, and registered companies',
      },
      {
        title: 'Company Onboarding & Registration',
        description:
          'Self-service registration portal where companies can onboard themselves, upload required documents, and maintain their profiles',
      },
      {
        title: 'Company Roster',
        description:
          'Searchable, filterable directory of all registered companies with status tracking and document verification',
      },
      {
        title: 'Document Management',
        description:
          'Upload, store, and track company documents with mandatory periodic update reminders (e.g. annual renewals)',
      },
      {
        title: 'Tender Management System',
        description:
          'Create and publish tenders with checklists, eligibility filters, and detailed requirements; companies can view and apply for relevant tenders',
      },
      {
        title: 'Project Tracking Dashboard',
        description:
          'Real-time project status tracking with milestones, progress indicators, and audit trail for infrastructure and solar projects',
      },
      {
        title: 'Transactions Management',
        description:
          'Admin-only module for recording financial transactions against projects and companies',
      },
      {
        title: 'Invoicing',
        description:
          'Generate GST-compliant invoices with line items and PDF export. Works standalone - admins can issue invoices to any party regardless of registration status; recorded payments link into Transactions',
      },
      {
        title: 'Admin Dashboard',
        description:
          'Overview panel for Consultway admins to manage companies, tenders, projects, and platform activity',
      },
      {
        title: 'Email Notifications',
        description:
          'Automated notifications for registration, tender updates, document expiry reminders, and status changes',
      },
      {
        title: 'Post-Deployment Support',
        description:
          '4 months of support included after launch, covering bug fixes and minor change requests',
      },
    ],
    costSectionLabel: 'Cost Breakdown',
    costTotalLabel: 'Total',
    costItems: [
      { item: 'UI/UX Design', amount: 100000 },
      { item: 'Auth & Role Management', amount: 75000 },
      { item: 'Company Onboarding & Roster', amount: 200000 },
      { item: 'Document Management', amount: 100000 },
      { item: 'Tender Management System', amount: 200000 },
      { item: 'Project Tracking Dashboard', amount: 250000 },
      { item: 'Transactions Management', amount: 175000 },
      { item: 'Invoicing', amount: 75000 },
      { item: 'Testing & Deployment', amount: 75000 },
    ],
    techStack: [
      { label: 'Frontend', value: 'Next.js + TailwindCSS' },
      { label: 'Backend', value: 'Next.js API Routes + Payload CMS' },
      { label: 'Database', value: 'Cloudflare D1' },
      { label: 'File Storage', value: 'Cloudflare R2' },
      { label: 'Hosting', value: 'Cloudflare (Pages + Workers)' },
    ],
    recurringCosts: [
      {
        item: 'Cloudflare (Hosting, Database, File Storage)',
        cost: '₹500–2,000/mo',
        notes: 'Pages + Workers, D1, and R2; scales with usage',
      },
      {
        item: 'Resend (Email Service)',
        cost: '₹0–1,700/mo',
        notes: 'Notifications and alerts; free tier covers low volume',
      },
    ],
    paymentTerms: [
      { milestone: 'Advance (project kickoff)', sharePercent: 30 },
      { milestone: 'On development completion', sharePercent: 30 },
      { milestone: 'After deployment', sharePercent: 40 },
    ],
    status: 'draft',
  },
]
