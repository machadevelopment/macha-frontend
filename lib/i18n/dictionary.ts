export interface Dictionary {
  common: {
    signIn: string;
    signOut: string;
    selectCompany: string;
    machaInternal: string;
    loading: string;
    /** aria-label del botón de cierre de Dialog/Sheet — lo lee un lector de pantalla. */
    close: string;
  };
  admin: {
    eyebrow: string;
    title: string;
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
    };
    table: {
      period: string;
      frequency: string;
      updated: string;
    };
  };
  alerts: {
    eyebrow: string;
    title: string;
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
