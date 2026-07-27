import type { Dictionary } from '../dictionary';

export const en: Dictionary = {
  common: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    selectCompany: 'Select a company',
    machaInternal: 'Macha Internal',
    loading: 'Loading…',
  },
  admin: {
    eyebrow: 'ADMIN',
    title: 'Backoffice',
  },
  home: {
    eyebrow: 'MACHA FINANCE',
    title: 'F1 Foundations',
    subtitle:
      'Scaffolding ready: design tokens, Inter/JetBrains Mono typography, light/dark themes.',
  },
  upload: {
    eyebrow: 'INGESTION',
    title: 'Upload data',
    subtitle: 'Upload your accounting Excel/CSV and track its processing.',
    dropzoneCta: 'Drag your file here or click to browse',
    dropzoneHint: '.xlsx, .xls or .csv',
    downloadTemplate: 'Download template',
    empty: "You haven't uploaded any files yet.",
    step: {
      queued: 'Queued',
      processing: 'Processing',
      review: 'Review',
      promoted: 'Done',
    },
    status: {
      queued: 'Queued',
      processing: 'Processing',
      review: 'In review',
      promoted: 'Done',
      reverted: 'Reverted',
      failed: 'Error',
    },
  },
};
