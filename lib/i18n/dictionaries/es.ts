import type { Dictionary } from '../dictionary';

export const es: Dictionary = {
  common: {
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    selectCompany: 'Selecciona una empresa',
    machaInternal: 'Macha Internal',
    loading: 'Cargando…',
  },
  admin: {
    eyebrow: 'ADMIN',
    title: 'Backoffice',
  },
  home: {
    eyebrow: 'MACHA FINANCE',
    title: 'Fundaciones F1',
    subtitle:
      'Scaffolding listo: tokens de diseño, tipografía Inter/JetBrains Mono y temas claro/oscuro.',
  },
  upload: {
    eyebrow: 'INGESTA',
    title: 'Cargar datos',
    subtitle: 'Sube tu Excel/CSV contable y sigue su procesamiento.',
    dropzoneCta: 'Arrastra tu archivo aquí o haz clic para buscarlo',
    dropzoneHint: '.xlsx, .xls o .csv',
    downloadTemplate: 'Descargar plantilla',
    empty: 'Todavía no has subido ningún archivo.',
    step: {
      queued: 'En cola',
      processing: 'Procesando',
      review: 'Revisión',
      promoted: 'Listo',
    },
    status: {
      queued: 'En cola',
      processing: 'Procesando',
      review: 'En revisión',
      promoted: 'Listo',
      reverted: 'Revertido',
      failed: 'Error',
    },
  },
  dashboard: {
    eyebrow: 'DASHBOARD',
    title: 'Panorama financiero',
    kpi: {
      revenue: 'Ingresos',
      cogs: 'Costo de ventas',
      margin: 'Margen',
    },
    trendTitle: 'Tendencia mensual',
    arApTitle: 'Cuentas por cobrar / pagar',
    ar: 'Por cobrar',
    ap: 'Por pagar',
    insightCta: 'Generar insight',
    insightLoading: 'Generando…',
    insightInsufficientCredits: 'Saldo de créditos insuficiente para generar un insight.',
    creditsLabel: 'créditos',
  },
};
