export interface Dictionary {
  common: {
    signIn: string;
    signOut: string;
    selectCompany: string;
    machaInternal: string;
    loading: string;
    /** aria-label del botón de cierre de Dialog/Sheet — lo lee un lector de pantalla. */
    close: string;
    /** Control de tema del `side-bot` (CU-868khvzdf). */
    theme: {
      /** aria-label del disparador: es un botón de solo ícono. */
      label: string;
      light: string;
      dark: string;
      /** "Sistema" = seguir la preferencia del SO (`enableSystem` de next-themes). */
      system: string;
    };
  };
  admin: {
    eyebrow: string;
    title: string;
  };
  /**
   * Shell de navegación (CU-868khvynk, design guide.md §7). El wordmark "Macha" NO
   * vive aquí a propósito: es la marca, no texto traducible — igual que un logotipo.
   */
  shell: {
    /** aria-label del <nav> del sidebar — lo anuncia un lector de pantalla. */
    mainNav: string;
    collapse: string;
    expand: string;
    /** aria-label del botón hamburguesa del topbar móvil (CU-868khvzbd). */
    openMenu: string;
    /** Encabezados de sección del sidebar (mono uppercase, `nav-sec`). */
    section: {
      analysis: string;
      data: string;
      account: string;
      operations: string;
      platform: string;
    };
    /** Etiquetas cortas de los ítems de nav: los títulos de pantalla no caben en 212px. */
    nav: {
      dashboard: string;
      alerts: string;
      upload: string;
      reports: string;
      chat: string;
      credits: string;
    };
    /** Ítems del backoffice — antes hardcodeados en español en components/admin/admin-nav.tsx. */
    adminNav: {
      companies: string;
      stagingRows: string;
      templates: string;
      creditRules: string;
      config: string;
      aiCost: string;
      uploads: string;
    };
  };
  home: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  upload: {
    eyebrow: string;
    title: string;
    subtitle: string;
    dropzoneCta: string;
    dropzoneHint: string;
    downloadTemplate: string;
    empty: string;
    revert: string;
    reverting: string;
    revertConfirm: string;
    loadMore: string;
    table: {
      file: string;
      status: string;
      date: string;
    };
    step: {
      queued: string;
      processing: string;
      review: string;
      promoted: string;
    };
    status: {
      queued: string;
      processing: string;
      review: string;
      promoted: string;
      reverted: string;
      failed: string;
    };
  };
  dashboard: {
    eyebrow: string;
    title: string;
    kpi: {
      revenue: string;
      cogs: string;
      margin: string;
    };
    trendTitle: string;
    arApTitle: string;
    ar: string;
    ap: string;
    /** Cabeceras de las tablas `sr-only` equivalentes a los charts (CU-868kfvaz9). */
    chart: {
      period: string;
      aging: string;
    };
    insightCta: string;
    insightLoading: string;
    insightInsufficientCredits: string;
    creditsLabel: string;
  };
  chat: {
    eyebrow: string;
    title: string;
    newChat: string;
    empty: string;
    placeholder: string;
    send: string;
    sending: string;
  };
  reports: {
    eyebrow: string;
    title: string;
    empty: string;
    viewRendered: string;
    edit: string;
    save: string;
    saving: string;
    saved: string;
    askInChat: string;
    chatThreadTitle: string;
    loadMore: string;
    kpi: {
      revenue: string;
      cogs: string;
      margin: string;
      /** CU-868khvzve: posición de liquidez al cierre del período. */
      arOpen: string;
      apOpen: string;
    };
    /** CU-868khvzve: `reports.frequency` viene del backend como valor crudo
     * (`monthly`/`quarterly`); esto lo traduce para mostrarlo. */
    frequencyValue: {
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
    };
    baseCurrencyLabel: string;
    table: {
      period: string;
      frequency: string;
      updated: string;
    };
  };
  alerts: {
    eyebrow: string;
    title: string;
    /** CU-868kj0tdq: el histórico es una pantalla distinta del detalle, con su
     * propio encabezado — `title` es el del detalle y decía "Detalle de alerta". */
    historyEyebrow: string;
    historyTitle: string;
    /** Cabeceras de la tabla del histórico. */
    table: {
      rule: string;
      triggeredValue: string;
      threshold: string;
      date: string;
    };
    empty: string;
    notFound: string;
    triggeredValue: string;
    threshold: string;
    triggeredAt: string;
    sourceDocument: string;
    noSourceDocument: string;
    backToDashboard: string;
    loadMore: string;
    /** Etiquetas del catálogo fijo de reglas (config/alert-catalog.ts en el backend).
     * El backend manda `ruleKey`, no el label, justamente para poder traducirlo aquí. */
    rule: {
      ar_overdue: string;
      portfolio_concentration: string;
      revenue_drop: string;
      margin_drop: string;
      spend_out_of_range: string;
      low_credit_balance: string;
    };
    /** Unidad en la que se expresa el valor de cada regla (días vs. porcentaje). */
    unit: {
      days: string;
      percent: string;
    };
  };
  register: {
    eyebrow: string;
    title: string;
    subtitle: string;
    name: string;
    industry: string;
    baseCurrency: string;
    locale: string;
    submit: string;
    submitting: string;
    error: string;
    noMembershipsTitle: string;
    noMembershipsSubtitle: string;
    noMembershipsCta: string;
  };
  credits: {
    eyebrow: string;
    title: string;
    subtitle: string;
    currentBalance: string;
    creditsLabel: string;
    quantity: string;
    pricePerCredit: string;
    submit: string;
    submitting: string;
    error: string;
    notOwner: string;
    topUpCta: string;
  };
}
