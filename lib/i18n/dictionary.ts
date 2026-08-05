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
    /**
     * Pantalla de último recurso cuando el árbol de React se cae entero
     * (`app/global-error.tsx`, CU-868kjc99f). No promete que el dato esté a salvo —
     * solo dice que el fallo se reportó y ofrece salir del paso.
     */
    error: {
      title: string;
      body: string;
      retry: string;
    };
    /**
     * Estados de fallo de una carga de datos del cliente (CU-868kkgb3c). Antes no
     * existían: un fetch caído dejaba el mismo `null` que "todavía cargando", así que la
     * pantalla se quedaba en blanco sin decir nada.
     *
     * Se distingue "no hubo respuesta" de "el servidor contestó que no" porque la acción
     * del usuario es distinta: en el primer caso reintentar sirve, en el segundo no.
     */
    loadError: {
      /** Fallo de red / sin respuesta. */
      network: string;
      /** El servidor respondió con error. */
      server: string;
      /** Sin permiso (403). */
      forbidden: string;
      retry: string;
    };
    /**
     * Boundaries de ruta (`error.tsx`, CU-868kkgb8f). Distinto de `common.error`, que es
     * el `global-error` de último recurso y reemplaza la app entera: esto degrada un
     * segmento dejando el shell en pie, así que puede ofrecer salidas de verdad.
     */
    routeError: {
      title: string;
      /**
       * El backend no contestó (5xx, timeout, red). Reintentar sirve, así que el texto
       * invita a hacerlo.
       */
      unavailable: string;
      /**
       * El backend contestó que no (403). Reintentar NO sirve — repetir el intento da el
       * mismo 403 —, así que el texto no lo sugiere.
       */
      denied: string;
      retry: string;
      /** Salida al inicio, para no dejar la pantalla sin ninguna acción. */
      home: string;
    };
    /**
     * `not-found.tsx` (CU-868kkgb8f). Lo alcanza tanto una URL inexistente como el
     * `notFound()` con el que `app/admin/layout.tsx` tapa el backoffice: el texto tiene
     * que servir a los dos sin insinuar que /admin existe.
     */
    notFound: {
      title: string;
      body: string;
      cta: string;
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
      members: string;
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
    /**
     * CU-868kmr0j5: el intercambio código→sesión falló y `/callback` devuelve aquí.
     * Lo alcanza quien CANCELA el login, quien tarda hasta que expira el código y quien
     * perdió la cookie PKCE (otro navegador, incógnito, cookies limpiadas a medias) —
     * no es un caso raro. Antes de esto, todos esos caminos terminaban en un 500 crudo.
     */
    authError: string;
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
      /** CU-868kh8y58: explicación del margen bruto en lenguaje de dueño, no contable. */
      marginHint: string;
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
    /**
     * CU-868kkgav2: el panel colapsaba TODO fallo en "créditos insuficientes" — un 500,
     * un 429 o un corte de red mandaban al usuario a comprar créditos que ya tenía.
     * Cada motivo dice ahora lo suyo.
     */
    insightError: {
      /** 402 con el detalle que ya manda el backend (`{required, balance}`). */
      insufficientDetail: string;
      /** 429: el gate de cola / rate limit por empresa. */
      rateLimited: string;
      /** 5xx o red: problema del sistema, no del saldo. */
      failed: string;
      retry: string;
    };
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

  /** CU-868kh8pwv: gestión de miembros autoservicio. */
  members: {
    eyebrow: string;
    title: string;
    subtitle: string;
    inviteTitle: string;
    inviteHint: string;
    emailLabel: string;
    emailPlaceholder: string;
    roleLabel: string;
    inviteAction: string;
    inviteSent: string;
    membersTitle: string;
    pendingTitle: string;
    pendingEmpty: string;
    colPerson: string;
    colRole: string;
    colStatus: string;
    removeAction: string;
    revokeAction: string;
    genericError: string;
    role: { owner: string; admin: string; member: string };
    status: { active: string; invited: string; revoked: string };
    accept: {
      title: string;
      subtitle: string;
      action: string;
      accepted: string;
      missingToken: string;
      genericError: string;
    };
  };
}
