import type { PeriodKey } from '@/lib/period';

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
       * La sesión venció (401). Reintentar NO sirve; la salida es volver a entrar.
       *
       * Existe como caso propio por una razón medida: antes un 401 se pintaba con
       * `unavailable` —"el servicio no está respondiendo"— y eso mandó a buscar una caída de
       * backend donde había una sesión vencida. El 2026-08-26 costó cerca de una hora de
       * diagnóstico. Ver `classifyApiFailure` en `lib/api/api-error.ts`.
       */
      expired: string;
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
    /**
     * Tramos de antigüedad de la cartera — CU-868kt2eh8.
     *
     * Viven en `common` y no bajo una pantalla porque los usan DOS: la gráfica de cuentas
     * por cobrar/pagar del dashboard y los tabs de cartera de Analítica. Dos juegos de
     * etiquetas para lo mismo terminan diciendo "1–30 días" en una pantalla y "1 a 30
     * días" en la otra — que es exactamente el estado del que viene este ticket.
     *
     * El formato sigue la regla de rangos de U3: "1 a 30", nunca "1-30" ni "1_30". El
     * guion se lee como resta cuando al lado hay cifras de dinero.
     */
    agingBucket: {
      current: string;
      '1_30': string;
      '31_60': string;
      '61_90': string;
      '90_plus': string;
    };
    /** Qué representa el eje de la gráfica de antigüedad. Sin esto, las barras son montos
     *  sin unidad: el usuario no sabe que están agrupadas por días de vencimiento. */
    agingAxisLabel: string;
  };
  /**
   * CU-868kh8zvt — el backoffice es bilingüe ES/EN por decisión de Jose (2026-07-28).
   *
   * La razón NO es operativa (el equipo de Macha trabaja en español) sino de negocio:
   * el panel admin es donde se demuestra la maquinaria del producto —revisión de filas,
   * gestión de empresas, costo de IA, control de créditos— ante inversionistas de habla
   * inglesa en una ronda. Mostrarlo a medias resta en el peor momento posible.
   *
   * Se hizo ahora y no después porque el panel de cliente nació con diccionario y por
   * eso soportar inglés ahí fue trivial, mientras que el admin nació con texto quemado y
   * por eso costó este ticket. Cada pantalla nueva del admin nace con sus textos acá.
   */
  admin: {
    eyebrow: string;
    title: string;
    /** Textos compartidos por los ocho paneles — no se repiten en cada bloque. */
    common: {
      loadError: { network: string; server: string; forbidden: string; retry: string };
      loading: string;
      loadMore: string;
      saving: string;
      save: string;
    };
    aiCost: {
      eyebrow: string;
      title: string;
      colCompany: string;
      colKind: string;
      colCost: string;
      colTokens: string;
      /**
       * Tasa de acierto del caché de prompt (migración backend 0025). Contesta "¿el caché
       * está pegando?" sin abrir el código — la pregunta que el diagnóstico de costos del
       * 2026-08-12 no pudo responder con un número.
       */
      colCache: string;
      /** Cuando la empresa no tiene entrada registrada: "sin datos", no "0 %". */
      cacheNone: string;
      colCalls: string;
    };
    companies: {
      createTitle: string;
      nameLabel: string;
      industryLabel: string;
      currencyLabel: string;
      localeLabel: string;
      createAction: string;
      creating: string;
      createError: string;
      statusError: string;
      colCompany: string;
      colIndustry: string;
      colCurrency: string;
      colStatus: string;
      suspend: string;
      activate: string;
      /**
       * Ticket B5 — columnas de la vista consolidada. El operador ve plan, saldo, costo
       * de IA y tokens sin salir de esta pantalla; antes eran tres.
       */
      colPlan: string;
      colBalance: string;
      colAiCost: string;
      colTokens: string;
      /** Empresa sin fila en `subscriptions` (las creadas a mano antes del autoservicio). */
      noPlan: string;
      /** Enlace al drill-down por tipo de acción, que sigue viviendo en `/admin/ai-cost`. */
      aiCostBreakdown: string;
    };
    companyDetail: {
      eyebrow: string;
      usersTitle: string;
      colEmail: string;
      colRole: string;
      colStatus: string;
      roleError: string;
      alertRulesTitle: string;
      colRule: string;
      colThreshold: string;
      colNotifyNow: string;
      thresholdError: string;
    };
    fxRates: {
      title: string;
      /** Se muestra cuando la empresa no tiene ni una tasa registrada. */
      emptyBadge: string;
      /** Lleva `{quote}` — se sustituye por la moneda del par (USD/GTQ). */
      emptyWarning: string;
      /** Lleva `{pair}` — se sustituye por "1 USD = GTQ", que es el sentido de la tasa. */
      rateLabel: string;
      dateLabel: string;
      submit: string;
      submitting: string;
      rateInvalid: string;
      dateInvalid: string;
      submitError: string;
      /** Cómo se elige la tasa de cada fila al promover. */
      resolutionHint: string;
      /** Que registrar una tasa no recalcula lo ya promovido. */
      retroactiveHint: string;
      colEffectiveDate: string;
      colRate: string;
      colCreatedAt: string;
    };
    credits: {
      title: string;
      balanceLabel: string;
      noBalance: string;
      amountLabel: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      submit: string;
      submitting: string;
      amountInvalid: string;
      reasonRequired: string;
      submitError: string;
      colDate: string;
      colAmount: string;
      colKind: string;
      colReason: string;
    };
    config: {
      eyebrow: string;
      title: string;
      invalidJson: string;
      /** Error del editor numérico — no todo parámetro se teclea como JSON. */
      invalidNumber: string;
      saveError: string;
      /**
       * Aviso para quien no es `super_admin`: ve los valores, no los edita. El gate
       * real es del backend (`edit_credits_to_tokens_param`); esto solo lo explica.
       */
      readOnlyNote: string;
      /** Prefijo de la marca de tiempo bajo cada parámetro. */
      /** Un parámetro sin fila en la base: valor de arranque, y es el que está en uso. */
      fromDefault: string;
      updatedAt: string;
      /** Autor del último cambio (ticket B7). Se antepone al correo. */
      updatedBy: string;
      /**
       * Etiqueta y descripción de cada `platform_settings.key` editable. Las claves son
       * los identificadores REALES del backend, no se traducen — se muestran tal cual
       * bajo el label, porque es con ellos que se opera.
       */
      settings: Record<string, { label: string; description: string }>;
    };
    /**
     * Catálogo de planes (ticket B3). Vive junto a `creditRules` y `config` porque los
     * tres son la configuración económica, con un reparto deliberado: reglas = cuántos
     * créditos cuesta cada acción; parámetros = equivalencia y precio del crédito;
     * planes = qué incluye cada plan y cuánto vale.
     */
    plans: {
      eyebrow: string;
      title: string;
      readOnlyNote: string;
      createTitle: string;
      /** El código es permanente: viaja a `subscriptions.plan_code`. Se avisa de entrada. */
      codeHint: string;
      codeLabel: string;
      nameLabel: string;
      priceLabel: string;
      creditsLabel: string;
      createAction: string;
      createError: string;
      saveError: string;
      invalidNumber: string;
      active: string;
      /** La baja es lógica, nunca un DELETE: hay empresas suscritas a planes retirados. */
      inactive: string;
      activate: string;
      deactivate: string;
    };
    /**
     * Solicitudes de demo de la landing. Solo lectura: la tabla es append-only y no hay
     * estado "contactado" (migración backend 0036).
     */
    demoRequests: {
      eyebrow: string;
      title: string;
      empty: string;
      colWhen: string;
      colName: string;
      colCompany: string;
      colEmail: string;
      colPhone: string;
      colMessage: string;
      colLocale: string;
    };
    creditRules: {
      eyebrow: string;
      title: string;
      newVersionTitle: string;
      actionLabel: string;
      typeLabel: string;
      perUnitLabel: string;
      publishAction: string;
      colAction: string;
      colType: string;
      colPerUnit: string;
      colVersion: string;
      colStatus: string;
    };
    documents: {
      eyebrow: string;
      title: string;
      colCompany: string;
      colFile: string;
      colStatus: string;
      colRows: string;
      /** `{n}` se sustituye por el conteo — no concatenar, el orden cambia en inglés. */
      flaggedSuffix: string;
    };
    industryTemplates: {
      /**
       * La plantilla .xlsx DESCARGABLE de una industria (Jose 2026-08-20) — el archivo para el
       * cliente que no tiene un Excel armado. Distinta de las versiones de sinónimos/few-shot
       * que están en la misma pantalla y que solo usa la IA.
       */
      starterEyebrow: string;
      starterHint: string;
      starterNone: string;
      starterFile: string;
      starterNotes: string;
      starterNotesPlaceholder: string;
      starterUpload: string;
      starterUploading: string;
      starterUploadError: string;
      eyebrow: string;
      title: string;
      colVersion: string;
      colCreated: string;
    };
    stagingRows: {
      /**
       * Marco de la PANTALLA: qué es esta cola y qué pasa si nadie la atiende (2026-08-20).
       * Distinto de `instructions`, que habla de UNA fila y por eso vive en su tarjeta.
       */
      intro: string;
      /** Qué NO le toca a staff: lo de nombre lo contesta el cliente en su propia carga. */
      introScope: string;
      eyebrow: string;
      title: string;
      empty: string;
      companyEyebrow: string;
      /** Solo sobrevive para el editor JSON de respaldo de una entidad desconocida. */
      invalidJson: string;
      saveError: string;
      reextractError: string;
      /** Qué se espera del operador. La bandeja no lo decía en ningún lado. */
      instructions: string;
      approve: string;
      reject: string;
      reextract: string;
      amountInvalid: string;
      reasonEyebrow: string;
      /** `targetEntity` en lenguaje humano; el backend manda `transaction|invoice|bill`. */
      entity: { transaction: string; invoice: string; bill: string };
      /**
       * Los nueve códigos de `flag_reason` que emite macha-backend
       * (`lib/staging-rules.ts` + `lib/fx.ts`), traducidos. `missing_fx_rate` NO estaba
       * en la lista del ticket y es el único con una salida concreta.
       */
      reason: {
        low_confidence: string;
        /** Sufijo con el porcentaje, cuando el código lo trae. `{value}`. */
        lowConfidenceDetail: string;
        invalid_type: string;
        missing_category: string;
        invalid_date: string;
        invalid_amount: string;
        invalid_currency: string;
        missing_counterparty: string;
        invalid_issue_date: string;
        /** `{currency}` y `{date}`. */
        missing_fx_rate: string;
        /** Regla nueva del backend que este frontend todavía no conoce. */
        unknown: string;
      };
      /** Etiquetas de los campos del payload, en vez de las claves crudas del JSON. */
      field: {
        type: string;
        category: string;
        date: string;
        description: string;
        amount: string;
        currency: string;
        product: string;
        quantity: string;
        productCategory: string;
        counterparty: string;
        issueDate: string;
        dueDate: string;
      };
      /** Los cuatro valores del enum `type` de un movimiento. */
      txType: { revenue: string; cogs: string; opex: string; other: string };
      empty_value: string;
    };
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
      analytics: string;
      productSales: string;
      inventory: string;
      alerts: string;
      upload: string;
      reports: string;
      chat: string;
      credits: string;
      members: string;
      settings: string;
    };
    /** Ítems del backoffice — antes hardcodeados en español en components/admin/admin-nav.tsx. */
    adminNav: {
      companies: string;
      stagingRows: string;
      templates: string;
      /** Catálogo de planes (ticket B3). Va junto a la demás configuración económica. */
      plans: string;
      creditRules: string;
      config: string;
      aiCost: string;
      uploads: string;
      /** Solicitudes de demo de la landing (Jose 2026-08-21). */
      demoRequests: string;
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
  /**
   * Landing pública (`app/page.tsx`). El español es el original del Figma; el inglés es
   * traducción. Ver la nota en `dictionaries/es.ts`.
   */
  landing: {
    nav: {
      inicio: string;
      comoFunciona: string;
      planes: string;
      faq: string;
      contacto: string;
      demo: string;
      /** Nombre accesible del disparador del menú de secciones en móvil (CU-868kv8m1v). */
      menu: string;
    };
    hero: {
      eyebrow: string;
      title: string;
      subtitle: string;
      demo: string;
      how: string;
      /** Describe QUÉ muestra el mockup, no que existe: es la única prueba visual del producto. */
      mockupAlt: string;
    };
    producto: {
      eyebrow: string;
      title: string;
      subtitle: string;
      pestanas: string[];
      mockupAlt: string;
    };
    porque: {
      eyebrow: string;
      title: string;
      subtitle: string;
      fragmentado: {
        eyebrow: string;
        hoy: string;
        filas: { archivo: string; estado: string }[];
      };
      centralizado: {
        eyebrow: string;
        titulo: string;
        colInfo: string;
        colEstado: string;
        sincronizado: string;
        filas: { info: string; estado: string }[];
        pie: string;
      };
    };
    como: {
      eyebrow: string;
      title: string;
      flujo: { datos: string; macha: string; insights: string };
      pasos: { titulo: string; desc: string }[];
    };
    /** El acordeón de 5. Cada item trae el panel de insights que se muestra al abrirlo. */
    capacidades: {
      eyebrow: string;
      title: string;
      items: {
        titulo: string;
        desc: string;
        insights: { titulo: string; desc: string; meta: string }[];
      }[];
    };
    asesor: {
      eyebrow: string;
      title: string;
      subtitle: string;
      preguntas: { q: string; a: string }[];
    };
    automatizacion: {
      eyebrow: string;
      title: string;
      subtitle: string;
      etapas: { titulo: string; sub: string }[];
      /**
       * `meta` es OPCIONAL a propósito: el diseño solo se lo da a la alerta de reportes. Poner
       * cadena vacía en las otras dos sería una clave vacía en el diccionario —que el test de
       * paridad marca, con razón— e inventarles un texto sería agregar información que el diseño
       * no quiso poner.
       */
      panel: { titulo: string; items: { titulo: string; desc: string; meta?: string }[] };
    };
    antesDespues: {
      eyebrow: string;
      title: string;
      antesEyebrow: string;
      conEyebrow: string;
      pares: { antes: string; con: string }[];
    };
    seguridad: { eyebrow: string; title: string; items: { titulo: string; desc: string }[] };
    planes: {
      eyebrow: string;
      title: string;
      nota: string;
      cta: string;
      /**
       * `precio` es OPCIONAL y eso es la mitad del diseño (CU-868kxar6m, Jose 2026-08-26).
       *
       * Este componente documentaba por qué la landing NO mostraba precios: *"un placeholder de
       * precios de un producto financiero sería lo peor que se podría hacer acá, un número que
       * nadie aprobó, en la pantalla donde el cliente decide si puede pagarlo."* Ese
       * razonamiento no se revierte — se cumple: Jose, que es quien aprueba el precio, dio dos
       * cifras concretas. Los planes que SÍ tienen precio aprobado lo muestran; "Personalizado"
       * sigue sin ninguno porque se cotiza, y un `precio` obligatorio obligaría a inventarle
       * algo, que es exactamente lo que la nota prohíbe.
       */
      items: { nombre: string; para: string; precio?: string; incluye: string[] }[];
    };
    faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
    cta: { title: string; subtitle: string; demo: string };
    /**
     * Formulario de solicitud de demo (Jose 2026-08-21). Reemplaza el `mailto` del CTA.
     * `title`/`subtitle` reusan el tono del cierre; los labels son los campos del form.
     */
    form: {
      title: string;
      subtitle: string;
      name: string;
      company: string;
      email: string;
      phone: string;
      message: string;
      submit: string;
      submitting: string;
      success: string;
      error: string;
      rateLimited: string;
    };
    footer: {
      tagline: string;
      privacidad: string;
      terminos: string;
      datos: string;
      copyright: string;
    };
    /** @deprecated Asunto del mailto; el CTA ahora es el formulario `#demo`. */
    demoAsunto: string;
  };
  upload: {
    /**
     * Los conceptos que la ingesta no logró clasificar y que contesta el CLIENTE durante la
     * subida — decisión de Semi, 2026-08-20. No va a revisión interna a propósito: es la
     * persona que sabe qué es "Cropa" en su propio libro.
     *
     * Se pregunta por CONCEPTO y no por fila: un archivo con 400 filas marcadas puede tener
     * seis conceptos, y 400 preguntas no las contesta nadie.
     * Ver `components/upload/conceptos-pendientes.tsx`.
     */
    /**
     * EL PORTÓN (migración 0042): qué entendimos del archivo, antes de publicarlo.
     *
     * Textos propios y no reutilizados del resumen de lectura: ahí el cliente LEE un informe
     * de algo que ya pasó, y acá DECIDE si pasa. La misma frase en los dos sitios haría que la
     * pantalla que pide una decisión se lea como una que solo informa.
     */
    confirmacion: {
      eyebrow: string;
      title: string;
      /** Lleva `{archivo}`. */
      subtitle: string;
      /** Encabezado de la lista de hojas. */
      sheetsTitle: string;
      /** Lo que aporta cada hoja que SÍ se usa. Lleva `{n}` y `{monto}`. */
      usada: string;
      /** Una hoja que no se usa, con su motivo ya redactado. */
      noUsada: string;
      inventario: string;
      /** El control para desconocer una hoja. */
      excluir: string;
      excluida: string;
      deshacer: string;
      conceptosTitle: string;
      /** Lleva `{n}`. */
      conceptosHint: string;
      publicar: string;
      publicando: string;
      publicado: string;
      error: string;
      /** El aviso de que nada entró todavía. */
      pendiente: string;
    };
    conceptos: {
      cta: string;
      /** Sin `{n}`: se usa mientras no se sabe cuántos son (ver el componente). */
      ctaSinConteo: string;
      title: string;
      subtitle: string;
      rows: string;
      typeLabel: string;
      categoryLabel: string;
      categoryPlaceholder: string;
      type: Record<'revenue' | 'cogs' | 'opex' | 'other', string>;
      /** El ejemplo bajo cada opción: es lo que hace contestable la pregunta sin saber contabilidad. */
      typeHint: Record<'revenue' | 'cogs' | 'opex' | 'other', string>;
      /** Lleva `{siguiente}`: el concepto al que se pasa después de guardar. */
      submitNext: string;
      /** Sin `{siguiente}`: es el último concepto. */
      submitLast: string;
      skip: string;
      /** Lleva `{n}` y `{total}`. En pantalla son los puntos; esto es para lectores de pantalla. */
      progress: string;
      submit: string;
      submitting: string;
      done: string;
      error: string;
      empty: string;
    };
    /**
     * CU-868krmrcj — "qué entendimos de tu archivo". Es lo que vuelve visibles los dos fallos
     * silenciosos de la ingesta: leer la columna equivocada y descartar hojas sin decirlo.
     * Ver `components/upload/read-summary.tsx`.
     */
    readSummary: {
      cta: string;
      /** Cargas anteriores a esta función, o que nunca llegaron a procesarse. */
      empty: string;
      /** Lleva `{n}`. */
      sheetMovements: string;
      /**
       * El COSTO que la hoja declaraba en su propia columna.
       *
       * Va rotulado y aparte del total de la hoja porque son dos cifras distintas de la misma
       * fila —el precio de venta y lo que costó— y ponerlas juntas sin decir cuál es cuál hace
       * dudar de las dos.
       */
      sheetCost: string;
      /** Lleva `{creados}` y `{ajustados}`. */
      sheetInventory: string;
      /** Por qué una hoja no produjo movimientos. Todos llevan `{n}`. */
      reason: Record<
        | 'catalogo'
        | 'reporte'
        | 'duplica_otra_hoja'
        | 'ya_ingerida'
        | 'vacia'
        /**
         * No se le pudo leer una fecha con dinero al lado. Antes se reportaba como `catalogo`,
         * que afirma algo sobre el CONTENIDO de la hoja que nosotros no sabemos: una
         * explicación equivocada le enseña al dueño a no creerle al resumen, que es lo único
         * con lo que puede desmentirnos.
         */
        | 'sin_fecha_ni_monto',
        string
      >;
      /**
       * Cuánto dinero se llevó un descarte. Lleva `{monto}`.
       *
       * Es la cifra que convierte una decisión invisible en una que el cliente puede
       * desmentir: "no se leyó, 220 filas" no le dice nada; "no entró a tus números:
       * Q 2.707.318" se contesta de un vistazo.
       */
      sheetSkippedMoney: string;
      /** Lleva `{movimientos}` y `{descartadas}`. */
      totals: string;
    };
    eyebrow: string;
    title: string;
    subtitle: string;
    dropzoneCta: string;
    dropzoneHint: string;
    downloadTemplate: string;
    downloadTemplateHint: string;
    empty: string;
    revert: string;
    reverting: string;
    revertConfirm: string;
    /** Parar una carga EN CURSO. Distinto de revertir, que deshace una ya terminada. */
    cancel: string;
    cancelling: string;
    cancelConfirm: string;
    retry: string;
    retrying: string;
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
      /** Terminal: el archivo no se pudo leer. No es reintentable — ver `unsupportedCta`. */
      unsupported: string;
      cancelled: string;
      /** Migración 0042: procesada y esperando el visto bueno del DUEÑO, no de Macha. */
      awaiting_confirmation: string;
    };
    /** CTA que reemplaza a "Reintentar" en un documento `unsupported`. */
    unsupportedCta: string;
  };
  dashboard: {
    eyebrow: string;
    title: string;
    /** Saludo por hora del USUARIO (se calcula en cliente; ver dashboard-greeting.tsx). */
    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    /**
     * CU-868krkqh2: plantilla con `{period}`, no una frase cerrada. Antes decía "este mes"
     * pasara lo que pasara con el filtro. Ver `dashboard-greeting.tsx`.
     */
    greetingSubtitle: string;
    /**
     * Cómo se nombra el período en la frase del saludo, una forma por `PeriodKey`.
     *
     * CU-868kt2aga: se escribe `Record<PeriodKey, …>` en vez de repetir la unión a mano.
     * Antes era una copia literal, y agregar un preset dejaba el saludo diciendo
     * `undefined` sin que nada fallara. Ahora el typechecker señala los dos diccionarios
     * en cuanto `PeriodKey` crece — que es exactamente lo que pasó al agregar "mes pasado"
     * y "este trimestre".
     */
    greetingPeriod: Record<PeriodKey, string>;
    importCta: string;
    /** Filtro de período. "Personalizado" aún no existe: ver period-filter.tsx. */
    period: {
      label: string;
      today: string;
      week: string;
      month: string;
      /** CU-868kt2aga: el rango más pedido del dashboard, y el único que obligaba a
       *  teclear dos fechas a mano. */
      lastMonth: string;
      /** El trimestre CALENDARIO, que es con el que una PYME habla con su contador. */
      quarter: string;
      year: string;
      showing: string;
      vsPrevious: string;
      /** Rango personalizado (CU-868knx137). Un solo componente sirve a las tres pantallas. */
      custom: string;
      customFrom: string;
      customTo: string;
      customApply: string;
      /** Los tres motivos de `CustomRangeError` en `lib/period.ts`. */
      customIncomplete: string;
      customReversed: string;
      customFuture: string;
      /** Ventanas móviles: el rango que las píldoras de calendario no cubren. */
      last7: string;
      last30: string;
      last90: string;
      /*
       * DOS plantillas y NO una función, aunque el singular cambie la palabra ("1 día", no
       * "1 días"). Un diccionario con una función adentro tumba el Dashboard entero: la
       * página es un Server Component y le pasa `t.dashboard` a `PeriodKpis`, que es de
       * cliente, y React no puede serializar una función a través de esa frontera. El
       * `.replace('{n}', ...)` es el mismo idioma que ya usa `emptyPeriod.outsideRange`.
       */
      customSpanOne: string;
      customSpanOther: string;
      /**
       * Qué abarcan los datos de la empresa, cuando el período visible deja algo afuera.
       * Ver `hayDatosFueraDelRango` en `lib/period.ts`.
       */
      dataSpan: string;
    };
    /**
     * CU-868krn2up: por qué el período elegido está en cero. Distingue "hay datos, pero en
     * otras fechas" de "no hay datos en toda la cuenta" — sin esa distinción, un cero
     * correcto se lee como un producto roto. Ver `period-empty-note.tsx`.
     */
    emptyPeriod: {
      /** Lleva `{from}` y `{to}`, ya formateados por el locale. */
      outsideRange: string;
      noDataAtAll: string;
    };
    /** El vacío distingue "no hubo ventas" de "hubo ventas sin producto identificado". */
    topProduct: {
      title: string;
      emptyNoSales: string;
      emptyUnattributed: string;
    };
    /**
     * CU-868kj3gnv: la tarjeta que dice en qué monedas entró el período y a qué tasa se
     * consolidó. Solo se pinta si la empresa tuvo DOS monedas en ese rango.
     */
    currency: {
      title: string;
      consolidatedIn: string;
      /** Rótulo de la fila de la moneda base: no lleva tasa porque la suya es 1. */
      ownCurrency: string;
      /** `{amount}`: lo que esa moneda aportó al consolidado. */
      contributed: string;
      /** Una sola tasa en el período: `{rate}`, `{date}`. */
      rateApplied: string;
      /**
       * Varias tasas: `{min}`, `{max}`, `{latest}`, `{date}`. Existe porque con una sola
       * cifra el cliente que multiplique no va a cuadrar y creerá que el dashboard miente.
       */
      rateRange: string;
      /** `{currency}`: la advertencia de que los montos de arriba NO se suman entre sí. */
      notSummed: string;
    };
    /**
     * El control para VER las cifras en la otra moneda (pedido de Keneth, 2026-08-26).
     *
     * Distinto de `currency`, que describe lo que PASÓ (qué monedas entraron y a qué tasa se
     * consolidaron). Esto describe una lente sobre el resultado, y por eso sus textos insisten
     * en que no es la contabilidad.
     */
    viewCurrency: {
      label: string;
      /** `{currency}`, `{rate}`, `{date}`: con qué se convirtió lo que se está viendo. */
      convertedAt: string;
      /** `{currency}`: la moneda en la que la contabilidad sigue registrada. */
      notAccounting: string;
      /** `{currency}`: no hay tasa, así que se invita a configurarla en vez de convertir. */
      missingRate: string;
      configure: string;
    };
    kpi: {
      revenue: string;
      revenueHint: string;
      cogs: string;
      /**
       * CU-868kuw01m: la tarjeta de COGS del dashboard. La frase tiene que decir qué NO
       * incluye — sin eso, "costo directo de ventas" y "gastos" se leen como sinónimos y el
       * dueño ve dos tarjetas que parecen contradecirse.
       */
      cogsHint: string;
      /** Costo directo + gasto operativo: "lo que me costó operar" en lenguaje de dueño. */
      expenses: string;
      expensesHint: string;
      grossProfit: string;
      grossProfitHint: string;
      /**
       * Ventas menos TODOS los gastos. Distinto del margen bruto, que por decisión de
       * Jose (CU-868kh8y58) no resta opex. Se muestran los dos porque responden
       * preguntas distintas y cada tarjeta dice de dónde sale su número.
       */
      cashFlow: string;
      cashFlowHint: string;
      margin: string;
      /** CU-868kh8y58: explicación del margen bruto en lenguaje de dueño, no contable. */
      marginHint: string;
      /** Pie del delta: sin esto un porcentaje no dice contra qué se compara. */
      vsPrevious: string;
      /**
       * CU-868ku9q7c. El delta del MARGEN va en PUNTOS PORCENTUALES, no en porcentaje: de
       * 50 % a 52 % son +2 pp, pero +4 % relativo. Con la leyenda de las otras tarjetas el
       * mismo "+2,0 %" se leería como la segunda cosa, que es un número distinto.
       */
      vsPreviousPp: string;
    };
    /** CU-868kn5hqu: por qué el dashboard puede estar en cero tras subir un Excel. */
    ingest: {
      eyebrow: string;
      processing: string;
      inReview: string;
      inReviewWithRows: string;
      explainer: string;
      cta: string;
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
    /**
     * Etiquetas de las categorías de consejo (CU-868knx0vh). El backend manda el código
     * (`collections`/`sales`/`financial`) y la traducción vive acá — mismo criterio que
     * `alerts.rule`: el backend clasifica, el diccionario nombra.
     */
    insightCategory: {
      cashflow: string;
      revenue: string;
      expenses: string;
      collections: string;
      /** Solo para consejos guardados antes de CU-868kx7a73; el modelo ya no los emite. */
      financial: string;
      sales: string;
    };
    /**
     * CU-868ku6r48: severidad del consejo. Mismo criterio que la línea de arriba — el backend
     * manda el código, el diccionario nombra. Los tres niveles son obligatorios: un consejo sin
     * rótulo de urgencia deja al usuario adivinando si algo urge.
     */
    insightSeverity: { critical: string; warning: string; info: string };
    /**
     * CU-868kt8bg0: el panel se llama "Consejo Financiero Diario", no "IA".
     *
     * Decirle "IA" al panel nombra la TECNOLOGÍA, no lo que el usuario recibe — y el dueño
     * de una PYME no abre el dashboard buscando inteligencia artificial, busca saber qué
     * hacer. Además estaba QUEMADO en el componente: era el único texto de esta pantalla
     * que no pasaba por el diccionario, así que en inglés también decía "IA".
     */
    insightTitle: string;
    insightCta: string;
    insightLoading: string;
    /**
     * CU-868krvtjw: qué hace el botón, antes de apretarlo.
     *
     * El panel en reposo era un rótulo "IA" y un botón, sin una línea que dijera qué va a
     * pasar ni sobre qué datos. Un botón que gasta créditos de la empresa no puede ser una
     * incógnita.
     */
    insightIdle: string;
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
    /** Bloque de alertas activas del rail derecho del dashboard. */
    keyAlerts: {
      title: string;
      /** Lleva `{value}`, `{threshold}` y `{unit}`. */
      triggered: string;
      empty: string;
      loadFailed: string;
      seeAll: string;
    };
  };
  /**
   * Ajustes de la empresa. Nace con el tipo de cambio, que era lo que tenía este ticket
   * bloqueado hasta que Jose cerró quién lo mantiene (2026-08-25).
   */
  settings: {
    title: string;
    subtitle: string;
    fx: {
      title: string;
      subtitle: string;
      current: string;
      since: string;
      none: string;
      /** Lo PRIMERO que dice la pantalla, y va ARRIBA del campo, no debajo del botón. */
      notRetroactive: string;
      rateLabel: string;
      dateLabel: string;
      save: string;
      saved: string;
      invalid: string;
      readOnly: string;
      history: string;
    };
  };
  chat: {
    eyebrow: string;
    title: string;
    newChat: string;
    placeholder: string;
    send: string;
    sending: string;
    /**
     * CU-868krvtya — el chat salió del "frame".
     *
     * `threads` titula el riel de conversaciones, que en escritorio es una columna y bajo
     * 1080px pasa a un drawer con `openThreads` de disparador (necesita nombre accesible:
     * es un botón de solo ícono). `composerHint` explica Enter vs Mayús+Enter, que dejó de
     * ser obvio al cambiar el input de una línea por un área que crece.
     */
    threads: string;
    openThreads: string;
    noThreads: string;
    composerHint: string;
    /** Mientras el asesor responde. Antes solo cambiaba el rótulo del botón. */
    thinking: string;
    /**
     * CU-868ktvqjm: ahora sí dice "Cancelar", y es cierto.
     *
     * Nació como "Dejar de esperar" en CU-868ktmdex porque el turno NO era cancelable: el
     * botón soltaba la pantalla y el modelo seguía escribiendo. Con la señal de la petición
     * propagada hasta Claude, cancelar corta la llamada de verdad, así que el rótulo puede
     * decirlo. El orden importó: el backend se desplegó primero, porque un botón que promete
     * cancelación sin tenerla es peor que no tener botón.
     *
     * `refreshThread` se fue con el cambio: existía para ir a buscar la respuesta que iba a
     * llegar igual. Ahora no llega ninguna, así que no hay nada que refrescar.
     */
    stopWaiting: string;
    stoppedWaiting: string;
    /**
     * Sin créditos no se manda el prompt — CU-868kxjucv.
     *
     * El chat cobraba y no bloqueaba, así que una empresa sin saldo seguía usando el asesor y
     * su balance se iba a negativo. Ahora el backend responde 402 antes de llamar al modelo, y
     * este texto es lo que hace tolerable que el corte ocurra a mitad de una conversación:
     * dice qué falta y ofrece dónde resolverlo, en vez del error genérico de red.
     */
    insufficientCredits: string;
    topUp: string;
    /**
     * Estado vacío del asesor (CU-868knx189). Sustituye a la antigua `chat.empty`, que era
     * una sola línea gris — se borra en vez de dejarla huérfana en el diccionario.
     */
    welcome: {
      title: string;
      subtitle: string;
      quickLabel: string;
      /** Reemplaza a `quickLabel` mientras el usuario ya escribió algo: explica el sello vivo. */
      listeningLabel: string;
      /** Las cuatro preguntas rápidas, una por eje: caja, margen, gasto y cobros. */
      q1: string;
      q2: string;
      q3: string;
      q4: string;
    };
  };
  reports: {
    eyebrow: string;
    title: string;
    empty: string;
    viewRendered: string;
    /** Descargas del reporte (ticket B2). El binario vive en S3; esto abre su URL firmada. */
    downloadPdf: string;
    downloadExcel: string;
    /**
     * Generador a demanda (ticket B2). Reportes dejó de ser una lista que llenaba un cron.
     * La generación es ASÍNCRONA (202 `queued`), y los textos lo dicen explícitamente.
     */
    builder: {
      title: string;
      subtitle: string;
      readOnly: string;
      typeLabel: string;
      /** Nombre por tipo de reporte; la clave es el `type` que manda el backend. */
      type: Record<string, string>;
      /**
       * CU-868ktkn9w — QUÉ PRODUCE CADA TIPO, en una línea.
       *
       * El nombre solo ("Resumen ejecutivo") no dice qué va a salir del otro lado, y la
       * pantalla no lo explicaba en ningún otro lugar. Misma clave que `type`: el `type`
       * del backend. Un tipo sin entrada acá se pinta solo con su nombre, así que agregar
       * uno en el backend no rompe la pantalla — solo la deja menos explicada.
       */
      typeDescription: Record<string, string>;
      sectionsLabel: string;
      sectionsRequired: string;
      instructionsLabel: string;
      instructionsPlaceholder: string;
      /** CU-868kt96fw. `{sections}` se rellena con las secciones SIN marcar. */
      instructionsScope: string;
      instructionsScopeAll: string;
      generate: string;
      generating: string;
      /** `{n}` = créditos que costó. Dice "en cola", nunca "listo". */
      queued: string;
      error: string;
      /** `{required}` y `{balance}`: el 402 los trae y son la salida accionable. */
      insufficientCredits: string;
      queueFull: string;
    };
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
    /**
     * CU-868krvrxy — cabecera de descarga del prototipo de Lovable.
     *
     * El prototipo pone "Descargar Excel / Descargar PDF" arriba de todo. Acá bajan el
     * ÚLTIMO reporte generado, no un export de datos en crudo: ese export directo no
     * existe en el backend, y prometerlo en el texto sería vender algo que no se entrega.
     * Ver la nota de `ReportsHeader`.
     */
    downloadHeader: {
      title: string;
      subtitle: string;
      /** Cuando la empresa todavía no ha generado ningún reporte descargable. */
      empty: string;
    };
    baseCurrencyLabel: string;
    /**
     * CU-868ktkn9w — el historial es una SECCIÓN, no la continuación de la pantalla.
     *
     * La tabla colgaba suelta debajo del generador, sin tarjeta ni encabezado: leído de
     * arriba abajo, las filas parecían el resultado de lo que se acababa de configurar
     * arriba y no el archivo de lo ya generado. El prototipo la titula ("Historial de
     * reportes") dentro de su propia tarjeta.
     */
    historyTitle: string;
    table: {
      period: string;
      frequency: string;
      updated: string;
      /** CU-868krw2wn: columna de estado. Un reporte que no se completó lo DICE. */
      status: string;
    };
    /**
     * Estado de un reporte en la lista (CU-868krw2wn).
     *
     * La fila de `reports` se crea antes de generar la narrativa, así que una generación
     * fallida dejaba una fila sin contenido que se veía IGUAL que una buena — y al abrirla
     * daba "no encontrado". `notGenerated` es lo que se muestra en su lugar.
     */
    status: {
      ready: string;
      /**
       * CU-868ktkuq0: el reporte se está generando AHORA. No es un fallo — es el estado
       * normal de todo reporte recién pedido, y antes se pintaba con `notGenerated`.
       */
      generating: string;
      generatingHint: string;
      notGenerated: string;
      notGeneratedHint: string;
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
    /**
     * Pantalla de configuración de reglas por empresa (ronda de QA 2026-08-11).
     *
     * Las etiquetas de regla NO se toman del backend aunque `GET /alert-rules` mande un
     * `label`: el catálogo de macha-backend (`config/alert-catalog.ts`) es español-only y
     * esta pantalla es del cliente, que puede estar en inglés. El nombre sale de
     * `alerts.rule` (que ya existía) y la descripción de `alerts.config.description`.
     */
    config: {
      tabHistory: string;
      tabConfig: string;
      title: string;
      subtitle: string;
      thresholdLabel: string;
      enabledOn: string;
      enabledOff: string;
      save: string;
      saving: string;
      saved: string;
      saveFailed: string;
      /** Informativo: el cliente ve cuáles avisan al instante, pero no puede cambiarlo. */
      notifyImmediately: string;
      notifyBatched: string;
      readOnly: string;
      empty: string;
      /** Una por regla; las mismas seis claves que `alerts.rule`. */
      description: Record<keyof Dictionary['alerts']['rule'], string>;
    };
  };
  /**
   * CU-868krmrcj fase C: el paso de configuración de archivos, justo después del alta.
   * Pantalla de vitrina — ver `app/onboarding/page.tsx`.
   */
  onboarding: {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** Las tres razones de por qué conviene subirlo ahora y no después. */
    whyTitle: string;
    why1: string;
    why2: string;
    why3: string;
    /** Estado posterior a la subida. No sigue el procesamiento: eso vive en Carga de datos. */
    uploadedTitle: string;
    uploadedBody: string;
    goToDashboard: string;
    /**
     * La salida para quien todavía no lleva sus finanzas en un Excel. Sin ella, el
     * onboarding es un muro para justo el cliente que más necesita entrar y mirar.
     */
    skip: string;
    skipHint: string;
  };
  register: {
    eyebrow: string;
    title: string;
    subtitle: string;
    name: string;
    industry: string;
    /** Opción vacía del desplegable: elegir el rubro es elegir la plantilla de Excel. */
    industryPlaceholder: string;
    baseCurrency: string;
    locale: string;
    /**
     * CU-868knx0vh: las dos secciones del alta se nombran con un eyebrow en mono. NO son
     * pasos —el formulario sigue siendo una sola pantalla, decisión de B4—, son rótulos:
     * lo que antes eran dos títulos del mismo peso ahora tiene jerarquía.
     */
    planEyebrow: string;
    companyEyebrow: string;
    /** Encabezado de la segunda sección; el plan ya tenía el suyo (`planTitle`). */
    companyTitle: string;
    /** Selección de plan en el alta (ticket B4). El catálogo sale de `/register/plans`. */
    planTitle: string;
    planSubtitle: string;
    /** `{n}` = créditos incluidos. */
    planCredits: string;
    planFree: string;
    planPerMonth: string;
    planRecommended: string;
    /** Catálogo vacío o endpoint caído: no se esconde el formulario en silencio. */
    plansUnavailable: string;
    submit: string;
    /** "Continuar al pago" delante de un plan gratuito sería una promesa falsa. */
    submitFree: string;
    submitting: string;
    error: string;
    /** 429 del bucket de alta (3/hora): el mensaje crudo es `rate_limited`. */
    rateLimited: string;
    noMembershipsTitle: string;
    noMembershipsSubtitle: string;
    noMembershipsCta: string;
  };
  credits: {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** Encabezado de la sección de recarga, ahora que la pantalla ya no es solo eso. */
    topUpTitle: string;
    currentBalance: string;
    creditsLabel: string;
    quantity: string;
    pricePerCredit: string;
    submit: string;
    submitting: string;
    error: string;
    notOwner: string;
    topUpCta: string;
    /**
     * Gestión de plan (ticket B3). La pantalla pasó de "Comprar créditos" a "Plan y
     * créditos": el plan es lo primero y la recarga individual queda debajo, conservada.
     */
    plan: {
      title: string;
      subtitle: string;
      readOnly: string;
      currentEyebrow: string;
      currentBadge: string;
      /** `{n}` = créditos incluidos en el plan. */
      includedCredits: string;
      free: string;
      perMonth: string;
      choose: string;
      changing: string;
      changeFailed: string;
      /** El upgrade no pasa por cobro en esta etapa; callarlo confundiría al owner. */
      noChargeNote: string;
      loadError: { network: string; server: string; forbidden: string; retry: string };
    };
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
      /**
       * CU-868knx0vh: la pantalla pasó a ser vitrina y su cabecera necesita el eyebrow
       * en mono que llevan todas (`/`, registro, 404). Antes la tarjeta empezaba directo
       * con el título.
       */
      eyebrow: string;
      title: string;
      subtitle: string;
      action: string;
      accepted: string;
      missingToken: string;
      genericError: string;
      /**
       * CU-868ktkq8r — la rama SIN sesión de `/invitations/accept`, que antes no existía
       * porque la ruta exigía sesión y mandaba directo a la hosted UI de WorkOS. Estos
       * textos son lo que el invitado nuevo lee ANTES de crear su cuenta, y su trabajo es
       * dejar claro que esto es unirse a una empresa que ya existe — no dar de alta una.
       */
      signedOutTitle: string;
      signedOutSubtitle: string;
      /**
       * Con qué cuenta se está viendo la pantalla — reporte de Jose, 2026-08-26 ("al aceptar
       * la invitación no sirve").
       *
       * Medido en producción: de 10 invitaciones creadas, **ninguna se aceptó jamás**, y en la
       * captura el invitado tenía sesión pero sin ninguna invitación para su correo. Ese estado
       * es casi siempre el mismo: entró con una cuenta distinta de la invitada. La pantalla lo
       * decía ("revisa con qué correo iniciaste sesión") sin decir CUÁL era, y el único botón
       * reintentaba lo mismo — un callejón sin salida.
       *
       * `{email}`: el correo de la sesión actual.
       */
      signedInAs: string;
      /** Cerrar sesión y volver a esta misma invitación, conservando el token. */
      useAnotherAccount: string;
      signedOutCreateAccount: string;
      signedOutSignIn: string;
      /** Por qué importa con qué correo entra: la aceptación compara correos. */
      emailHint: string;
      /** Cada invitación de la lista. `{role}` = rol traducido (`members.role`). */
      asRole: string;
      join: string;
      /** Ni invitación viva ni token: el enlace venció, ya se usó, o es de otro correo. */
      noPending: string;
      /** No se pudo consultar el backend; no es lo mismo que "no tienes invitaciones". */
      unavailable: string;
      /**
       * Los tres rechazos que el backend distingue, dichos en el idioma del usuario. El
       * backend manda además su texto en español, que queda de red — pero esta pantalla
       * es la primera que ve un invitado angloparlante, y era la única del producto que
       * le contestaba en otro idioma. `invalid` cubre "no existe" y "ya no está
       * pendiente" con el MISMO texto a propósito: distinguirlos le diría a quien prueba
       * tokens cuáles existen.
       */
      rejection: { invalid: string; expired: string; wrongRecipient: string };
      /** Rama de `/` cuando el usuario no tiene empresa pero SÍ una invitación viva. */
      pendingTitle: string;
      /** `{company}` = nombre de la empresa que invita. */
      pendingSubtitle: string;
      pendingSubtitleMany: string;
      pendingCta: string;
    };
  };
  /** Analítica (pantalla del prototipo MVP Macha): las series y desgloses del período. */
  analytics: {
    eyebrow: string;
    title: string;
    revenueTrend: string;
    cashFlow: string;
    costByCategory: string;
    revenueByProduct: string;
    inflow: string;
    outflow: string;
    /**
     * De qué se compone "Salidas", para el tooltip — bug reportado por Jose el 2026-08-26.
     *
     * Reportó que el total de salidas "no coincide con el Excel". Medido contra producción:
     * **el número era correcto**. El 5 de agosto de Gym Supplements son GTQ 10.780,52, y su
     * Excel mostraba la nómina de 10.306,41; la diferencia son 474,11 de COSTO DE VENTAS, que
     * en su libro vive en otra hoja. La serie suma las dos cosas a propósito —así sale el
     * dinero de la cuenta— pero sin decirlo la cifra no se puede reconciliar con nada.
     */
    outflowCogs: string;
    outflowOpex: string;
    net: string;
    /**
     * CU-868knx15v: rótulo de la cifra grande que corona la tendencia. Sin él, un monto
     * enorme flotando sobre una gráfica no dice si es el total, el promedio o el último día.
     */
    periodTotal: string;
    /** Nombre accesible de la barra de participación de cada producto en el ingreso. */
    shareOfRevenue: string;
    colCategory: string;
    colType: string;
    colTotal: string;
    colShare: string;
    colMovements: string;
    empty: string;
    emptyHint: string;
    type: { revenue: string; cogs: string; opex: string; other: string };
    /**
     * CU-868kt29t0 — los seis tabs del prototipo. Las claves son los `value` de Radix, así
     * que renombrarlas cambia el estado del tab: no son solo texto.
     */
    tabs: {
      overview: string;
      revenue: string;
      cashFlow: string;
      costs: string;
      receivables: string;
      payables: string;
    };
    /**
     * Fila de KPIs del encabezado, común a todos los tabs.
     *
     * `netMargin` va como CONTEXTO del margen bruto y no como tarjeta propia, igual que en
     * el prototipo ("Net: X%"): son el mismo indicador con dos alcances, y separarlos en dos
     * tarjetas invita a leer uno como el otro.
     */
    header: {
      grossMargin: string;
      netMargin: string;
      result: string;
      resultHint: string;
      growth: string;
      growthHint: string;
      arOpen: string;
      arOpenHint: string;
    };
    /** Cuentas por cobrar y por pagar (tabs 5 y 6). */
    arAp: {
      agingTitle: string;
      concentrationTitle: string;
      /** `{n}` = cuántas contrapartes quedaron fuera del top. */
      rest: string;
      colCounterparty: string;
      colOverdue: string;
      colInvoices: string;
      colOldest: string;
      /**
       * ═══ LA LISTA DE CUENTAS, UNA POR UNA — CU-868kx4cr6 ═══
       *
       * Jose: *"si ya está pagada, se debería restar del balance abierto. Actualmente sale el
       * capital completo de las cuentas aunque ya están pagadas."* No había forma de marcarla,
       * y tampoco de VERLA: la pantalla solo mostraba totales por tramo y por contraparte.
       */
      openTitle: string;
      openHint: string;
      openEmpty: string;
      colDue: string;
      colStatus: string;
      colAmount: string;
      /** Acción sobre una cuenta abierta. */
      markPaid: string;
      /** Deshacer: marcar la equivocada es el error más probable de esta pantalla. */
      markOpen: string;
      statusPaid: string;
      statusOpen: string;
      /** Sin fecha de vencimiento en la fila del Excel. */
      noDueDate: string;
      totalOpen: string;
      overdueTotal: string;
      emptyAr: string;
      emptyAp: string;
    };
  };
  /** Ventas por producto. */
  productSales: {
    eyebrow: string;
    title: string;
    topProduct: string;
    unitsSold: string;
    avgTicket: string;
    bestCategory: string;
    slowMover: string;
    allProducts: string;
    revenuePerUnit: string;
    performance: string;
    salesByCategory: string;
    /** CU-868kuw1e3: la tarjeta de ventas por tienda, con sus DOS vacíos. */
    salesByStore: string;
    /**
     * Vacío por FALTA DE DATO: la empresa vendió, pero ninguna venta trae tienda. Es el caso
     * normal — la mayoría de los Excel de una PYME no traen esa columna — y por eso se dice
     * qué hacer para cambiarlo, en vez de dejar una tarjeta muda.
     */
    storesEmptyNoColumn: string;
    storesEmptyNoColumnHint: string;
    /** Vacío por FALTA DE VENTAS. Distinto del anterior: si dijeran lo mismo, quien sí tiene
     *  sucursales creería que el producto no las soporta. */
    storesEmptyNoSales: string;
    /** `{amount}`: ventas sin tienda, para que el 100 % del donut no se lea como el 100 %
     *  de las ventas del período. */
    storesUnattributed: string;
    /** CU-868knx1a0: EXPORTAR la tabla que ya está en pantalla. No es importar — la
     *  carga de datos vive en su propia pantalla ("Cargar datos"). */
    exportCsv: string;
    /** Base del nombre del archivo descargado; el rango de fechas se le agrega aparte.
     *  Va en el diccionario porque el usuario lo ve: es el nombre del archivo que le
     *  queda en Descargas. */
    csvFileName: string;
    colProduct: string;
    colCategory: string;
    colUnits: string;
    colRevenue: string;
    colCogs: string;
    colMargin: string;
    colShare: string;
    colTrend: string;
    uncategorized: string;
    /** Lo que se muestra donde el archivo del cliente no trae unidades. NO es "0". */
    noUnits: string;
    noUnitsHint: string;
    empty: string;
    emptyHint: string;
    trend: { up: string; down: string; flat: string };
  };
  /** Inventario. */
  inventory: {
    /**
     * CU-868kt25ev — marca del costo DEDUCIDO.
     *
     * Cuando la hoja de existencias del cliente no trae columna de costo, el backend lo
     * deduce del costo promedio de lo que ya vendió de ese producto. La cifra es correcta,
     * pero no salió del archivo — y en un producto financiero esa diferencia importa.
     */
    derivedCost: { badge: string; hint: string };
    eyebrow: string;
    title: string;
    subtitle: string;
    stockValue: string;
    skuCount: string;
    belowReorder: string;
    itemsTitle: string;
    movementsTitle: string;
    addItem: string;
    editItem: string;
    recordMovement: string;
    colSku: string;
    colName: string;
    colLocation: string;
    colOnHand: string;
    colReorder: string;
    colUnitCost: string;
    colValue: string;
    colSupplier: string;
    colLastRestock: string;
    colActions: string;
    colWhen: string;
    colItem: string;
    colMovement: string;
    colQuantity: string;
    colAfter: string;
    colReason: string;
    fieldSku: string;
    fieldName: string;
    fieldLocation: string;
    fieldInitialStock: string;
    fieldReorderPoint: string;
    fieldUnitCost: string;
    fieldCurrency: string;
    fieldSupplier: string;
    fieldMovementType: string;
    fieldQuantity: string;
    fieldReason: string;
    stockIsLedger: string;
    save: string;
    discontinue: string;
    discontinueConfirm: string;
    empty: string;
    emptyHint: string;
    movementsEmpty: string;
    genericError: string;
    movement: { in: string; out: string; adjustment: string };
  };
}
