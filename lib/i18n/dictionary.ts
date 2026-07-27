export interface Dictionary {
  common: {
    signIn: string;
    signOut: string;
    selectCompany: string;
    machaInternal: string;
    loading: string;
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
    insightCta: string;
    insightLoading: string;
    insightInsufficientCredits: string;
    creditsLabel: string;
  };
}
