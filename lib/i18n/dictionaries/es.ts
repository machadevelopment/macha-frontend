import type { Dictionary } from '../dictionary';

export const es: Dictionary = {
  common: {
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    selectCompany: 'Selecciona una empresa',
    machaInternal: 'Macha Internal',
    loading: 'Cargando…',
    close: 'Cerrar',
    theme: {
      label: 'Tema',
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
    },
    error: {
      title: 'Algo se rompió',
      body: 'El error se reportó al equipo. Puedes reintentar o volver más tarde.',
      retry: 'Reintentar',
    },
    loadError: {
      network: 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.',
      server: 'No pudimos cargar estos datos. Intenta de nuevo en un momento.',
      forbidden: 'No tienes acceso a esta información.',
      retry: 'Reintentar',
    },
    routeError: {
      title: 'No pudimos mostrar esta pantalla',
      unavailable: 'El servicio no está respondiendo. Suele ser pasajero: vuelve a intentar.',
      expired: 'Tu sesión venció. Vuelve a iniciar sesión para continuar.',
      denied: 'No tienes acceso a esta sección.',
      retry: 'Reintentar',
      home: 'Ir al inicio',
    },
    notFound: {
      title: 'Esta página no existe',
      body: 'Puede que el enlace esté mal o que la página se haya movido.',
      cta: 'Ir al inicio',
    },
    agingBucket: {
      current: 'Al día',
      '1_30': '1 a 30 días',
      '31_60': '31 a 60 días',
      '61_90': '61 a 90 días',
      '90_plus': 'Más de 90 días',
    },
    agingAxisLabel: 'Antigüedad de la cartera (días de vencimiento)',
  },
  admin: {
    common: {
      loadError: {
        network: 'No se pudo conectar con el servidor. Revisa la conexión e intenta de nuevo.',
        server: 'No se pudieron cargar estos datos. Intenta de nuevo en un momento.',
        forbidden: 'No autorizado — se necesita rol staff/super_admin.',
        retry: 'Reintentar',
      },
      loading: 'Cargando…',
      loadMore: 'Cargar más',
      saving: 'Guardando…',
      save: 'Guardar',
    },
    aiCost: {
      eyebrow: 'COSTO IA',
      title: 'Costo por empresa',
      colCompany: 'Empresa',
      colKind: 'Tipo',
      colCost: 'Costo',
      colTokens: 'Tokens in/out',
      colCache: 'Caché',
      cacheNone: 'sin datos',
      colCalls: 'Llamadas',
    },
    companies: {
      createTitle: 'Alta manual de empresa',
      nameLabel: 'Empresa',
      industryLabel: 'Industria',
      currencyLabel: 'Moneda',
      localeLabel: 'Idioma',
      createAction: 'Crear empresa (aprovisiona partición)',
      creating: 'Creando…',
      createError: 'No se pudo crear la empresa.',
      statusError: 'No se pudo cambiar el estado de la empresa.',
      colCompany: 'Empresa',
      colIndustry: 'Industria',
      colCurrency: 'Moneda',
      colStatus: 'Estado',
      suspend: 'Suspender',
      activate: 'Activar',
      colPlan: 'Plan',
      colBalance: 'Saldo',
      colAiCost: 'Costo IA',
      colTokens: 'Tokens in/out',
      noPlan: 'Sin plan',
      aiCostBreakdown: 'Ver desglose por tipo de acción',
    },
    companyDetail: {
      eyebrow: 'EMPRESA',
      usersTitle: 'Usuarios',
      colEmail: 'Email',
      colRole: 'Rol',
      colStatus: 'Estado',
      roleError: 'No se pudo cambiar el rol de este usuario.',
      alertRulesTitle: 'Umbrales de alerta',
      colRule: 'Regla',
      colThreshold: 'Umbral',
      colNotifyNow: 'Notifica de inmediato',
      thresholdError: 'No se pudo actualizar este umbral.',
    },
    fxRates: {
      title: 'Tasas de cambio',
      emptyBadge: 'sin tasa',
      emptyWarning:
        'Sin ninguna tasa registrada, cada fila en {quote} de cada carga se marca para revisión manual y la carga no se puede promover. Una sola tasa con fecha de vigencia anterior a la más antigua del libro las desbloquea todas.',
      rateLabel: 'TASA ({pair})',
      dateLabel: 'VIGENTE DESDE',
      submit: 'Registrar tasa',
      submitting: 'Registrando…',
      rateInvalid: 'La tasa debe ser un número mayor que 0.',
      dateInvalid: 'Elige la fecha desde la que rige la tasa.',
      submitError: 'No se pudo registrar la tasa.',
      resolutionHint:
        'Cada fila usa la tasa más reciente que no sea posterior a su propia fecha, así que registrar una tasa vieja cubre todo lo que venga después de ella.',
      retroactiveHint:
        'Registrar una tasa no recalcula lo ya promovido: cada fila congeló la suya al promoverse. Para corregir una conversión ya escrita hay que revertir la carga y volver a promoverla.',
      colEffectiveDate: 'Vigente desde',
      colRate: 'Tasa',
      colCreatedAt: 'Registrada',
    },
    credits: {
      title: 'Créditos',
      balanceLabel: 'SALDO',
      noBalance: 'sin saldo',
      amountLabel: 'Movimiento',
      reasonLabel: 'Razón',
      reasonPlaceholder: 'Compensación por carga fallida del 3 de agosto',
      submit: 'Registrar',
      submitting: 'Registrando…',
      amountInvalid: 'El movimiento debe ser un número entero distinto de 0.',
      reasonRequired: 'Escribe la razón del movimiento.',
      submitError: 'No se pudo registrar el movimiento.',
      colDate: 'Fecha',
      colAmount: 'Movimiento',
      colKind: 'Tipo',
      colReason: 'Razón',
    },
    config: {
      eyebrow: 'CONFIGURACIÓN',
      title: 'Parámetros de negocio',
      invalidJson: 'El valor no es JSON válido.',
      invalidNumber: 'Escribe un número válido.',
      readOnlyNote:
        'Estos parámetros solo los edita un super_admin. Aquí se muestran en modo lectura.',
      /*
       * Un parámetro que todavía no tiene fila en `platform_settings`. Dice las dos cosas que
       * importan: que nadie lo cambió, Y que el valor mostrado es el que el sistema está usando.
       * Sin la segunda mitad se leería como "esto no está configurado", que es justo la
       * conclusión equivocada que dejaba la pantalla vacía.
       */
      fromDefault: 'Valor de arranque · nadie lo ha cambiado, y es el que está en uso',
      updatedAt: 'Actualizado',
      updatedBy: 'por',
      saveError: 'No se pudo guardar. El valor sigue siendo el anterior.',
      settings: {
        credit_to_tokens_ratio: {
          label: 'Tokens por crédito (uso interno, no visible al cliente)',
          description:
            'Cuántos tokens de Claude representa un crédito al debitar consumo de IA. El cliente solo ve créditos, nunca tokens.',
        },
        credit_monthly_allotment: {
          label: 'Asignación mensual de créditos',
          description: 'Créditos que se acreditan a cada empresa al inicio de su ciclo mensual.',
        },
        credit_initial_grant: {
          label: 'Créditos iniciales de una empresa nueva',
          description:
            'Créditos con los que arranca una empresa recién aprovisionada, para que pueda probar el producto antes de su primer ciclo.',
        },
        credit_price_usd_cents: {
          label: 'Precio de venta del crédito (centavos de USD)',
          description:
            'Precio de un crédito en centavos de dólar. Valor provisional de F0: falta confirmarlo con el dueño del negocio.',
        },
        insight_prompt_template: {
          label: 'Prompt de insight (catálogo de prompts)',
          description:
            'Este texto es el prompt que se envía a Claude en cada insight. Al generarse un insight queda congelado en insight_requests.prompt_snapshot, así que editarlo afecta únicamente a los insights futuros: los ya emitidos conservan el prompt con el que se produjeron.',
        },
        intake_max_file_size_mb: {
          label: 'Tamaño máximo de archivo de ingesta (MB)',
          description:
            'Peso máximo aceptado por el Excel que sube el cliente. Arriba de esto se rechaza.',
        },
        intake_max_rows_per_file: {
          label: 'Filas máximas por archivo de ingesta',
          description: 'Tope de filas parseadas por documento antes de rechazar la ingesta.',
        },
        rate_limit_ai_rpm: {
          label: 'Llamadas de IA por minuto (por empresa)',
          description: 'Capacidad del token-bucket por empresa que limita las llamadas a Claude.',
        },
        anthropic_model: {
          label: 'Modelo de Claude',
          description:
            'Modelo usado en todas las llamadas de IA. Ante cualquier cambio hay que re-verificar la elegibilidad ZDR del modelo.',
        },
      },
    },
    plans: {
      eyebrow: 'PLANES',
      title: 'Catálogo de planes',
      readOnlyNote:
        'Solo un super_admin puede editar el catálogo. Aquí se muestra en modo lectura.',
      createTitle: 'Nuevo plan',
      codeHint:
        'El código es permanente: viaja a la suscripción de cada empresa. Minúsculas, dígitos y guion bajo.',
      codeLabel: 'Código',
      nameLabel: 'Nombre',
      priceLabel: 'Precio (centavos USD)',
      creditsLabel: 'Créditos incluidos',
      createAction: 'Crear plan',
      createError: 'No se pudo crear el plan.',
      saveError: 'No se pudo guardar el plan.',
      invalidNumber: 'Escribe un número válido.',
      active: 'Activo',
      inactive: 'Retirado',
      activate: 'Reactivar',
      deactivate: 'Retirar',
    },
    demoRequests: {
      eyebrow: 'CAPTACION',
      title: 'Solicitudes de demo',
      empty: 'Todavía no hay solicitudes.',
      colWhen: 'Cuándo',
      colName: 'Nombre',
      colCompany: 'Empresa',
      colEmail: 'Correo',
      colPhone: 'Teléfono',
      colMessage: 'Mensaje',
      colLocale: 'Idioma',
    },
    creditRules: {
      eyebrow: 'CRÉDITOS',
      title: 'Acción ↔ créditos',
      newVersionTitle: 'Nueva versión (desactiva la anterior de la misma acción)',
      actionLabel: 'Acción',
      typeLabel: 'Tipo',
      perUnitLabel: 'Créditos/unidad',
      publishAction: 'Publicar nueva versión',
      colAction: 'Acción',
      colType: 'Tipo',
      colPerUnit: 'Créditos/unidad',
      colVersion: 'Versión',
      colStatus: 'Estado',
    },
    documents: {
      eyebrow: 'MONITOREO',
      title: 'Uploads / procesos',
      colCompany: 'Empresa',
      colFile: 'Archivo',
      colStatus: 'Estado',
      colRows: 'Filas',
      flaggedSuffix: '({n} marcadas)',
    },
    industryTemplates: {
      /*
       * ═══ LA PLANTILLA DESCARGABLE, QUE NO ES LO MISMO QUE LAS VERSIONES ═══
       *
       * Las dos cosas se llaman "plantilla" y viven en la misma tarjeta, y confundirlas tiene
       * consecuencias en direcciones opuestas: subir un .xlsx creyendo que mejora la
       * clasificación de la IA no mejora nada, y editar sinónimos creyendo que cambia lo que el
       * cliente descarga tampoco. Por eso el texto dice PARA QUIÉN es el archivo.
       */
      starterEyebrow: 'PLANTILLA PARA EL CLIENTE',
      starterHint:
        'El archivo de Excel que descarga un cliente de esta industria que no tiene contabilidad armada. No es el material que usa la IA para leer archivos: eso son las versiones de arriba.',
      /*
       * "Ninguna" NO es un problema, y el texto tiene que decirlo. Sin esta aclaración un
       * operador puede creer que la descarga del cliente está rota, cuando lo que pasa es que
       * recibe una plantilla generada con las categorías de su industria.
       */
      starterNone:
        'Ninguna cargada. El cliente descarga igual una plantilla generada con las categorías de su industria.',
      starterFile: 'Archivo',
      starterNotes: 'Nota (opcional)',
      starterNotesPlaceholder: 'Ej. actualizada con el catálogo 2026',
      starterUpload: 'Publicar plantilla',
      starterUploading: 'Publicando…',
      starterUploadError: 'No se pudo publicar la plantilla. Vuelve a intentarlo.',
      eyebrow: 'CATÁLOGO',
      title: 'Plantillas por industria',
      colVersion: 'Versión',
      colCreated: 'Creada',
    },
    stagingRows: {
      /*
       * ═══ EL MARCO DE LA PANTALLA, QUE ES LO QUE FALTABA ═══
       *
       * Jose (2026-08-20): "está muy compleja, no se logra entender qué tiene que hacer el
       * equipo de MACHA ahí". La pantalla ya explicaba cada FILA —el motivo del marcado en
       * texto legible, los campos con etiqueta, los botones nombrados—, pero no explicaba la
       * COLA: de dónde salen estas filas, por qué existen y qué pasa si nadie las toca.
       *
       * El texto no se inventó: estaba escrito, palabra por palabra, en el comentario de
       * cabecera de `staging-rows-panel.tsx`. Lo veía quien lee el código y no quien usa la
       * pantalla.
       *
       * Dice las tres cosas que un operador nuevo necesita y ninguna más:
       *  1. de dónde viene la fila (un cliente subió su Excel y la IA la clasificó),
       *  2. por qué está acá (quedó con duda),
       *  3. qué pasa si nadie la resuelve — que es lo único que le da urgencia al trabajo y
       *     lo que no estaba en ningún lado: la fila NO está en la contabilidad del cliente
       *     todavía, así que su dashboard está incompleto hasta que alguien decida.
       */
      intro:
        'Cuando un cliente sube su Excel, la IA clasifica cada fila. Las que quedan con duda caen acá y NO entran a su contabilidad hasta que alguien las resuelva: mientras estén en esta lista, faltan en su dashboard.',
      /*
       * La otra mitad, y va aparte a propósito: qué NO le toca a este equipo.
       *
       * Desde el acuerdo con Semi (2026-08-20) el CLIENTE contesta sus propios conceptos sin
       * clasificar durante la subida. Sin decirlo acá, un operador puede pasar la tarde
       * poniéndole categorías a filas que el dueño del negocio va a contestar mejor — y
       * pisándolo, porque la respuesta del cliente vale más que la de staff.
       */
      introScope:
        'Lo que es un problema de NOMBRE —no saber a qué rubro va un concepto— lo contesta el cliente desde su propia carga. Acá llega lo que ninguna categoría arregla: una fecha ilegible, un monto que no se entiende, una fila que quizá no debería entrar.',
      eyebrow: 'INGESTA',
      title: 'Filas marcadas',
      empty: 'Sin filas pendientes de revisión.',
      companyEyebrow: 'EMPRESA',
      invalidJson: 'El payload no es JSON válido.',
      saveError: 'No se pudo guardar la revisión de esta fila.',
      reextractError: 'No se pudo re-extraer esta fila.',
      instructions:
        'Revisa esta fila: corrige lo que esté mal y apruébala, o recházala si no debe entrar.',
      approve: 'Aprobar',
      reject: 'Rechazar',
      reextract: 'Re-extraer con IA (sin costo de créditos)',
      amountInvalid: 'El monto debe ser un número.',
      reasonEyebrow: 'POR QUÉ SE MARCÓ',
      entity: {
        transaction: 'Movimiento',
        invoice: 'Factura por cobrar',
        bill: 'Factura por pagar',
      },
      reason: {
        low_confidence: 'La IA no está segura de cómo interpretar esta fila.',
        lowConfidenceDetail: 'Confianza: {value}.',
        invalid_type: 'El tipo de movimiento no se reconoce.',
        missing_category: 'Falta la categoría.',
        invalid_date: 'La fecha no es válida o falta.',
        invalid_amount: 'El monto no es válido (vacío, cero o negativo).',
        invalid_currency: 'La moneda no es válida (solo GTQ o USD).',
        missing_counterparty: 'Falta el cliente o proveedor.',
        invalid_issue_date: 'La fecha de emisión no es válida.',
        missing_fx_rate:
          'No hay tasa de cambio registrada para convertir {currency} en esta empresa, así que el movimiento del {date} no se pudo convertir. Regístrala en Empresa › Tasas de cambio: con cualquier fecha de vigencia alcanza, se usa la más cercana disponible.',
        unknown: 'Motivo no reconocido por esta pantalla:',
      },
      field: {
        type: 'Tipo',
        category: 'Categoría',
        date: 'Fecha',
        description: 'Descripción',
        amount: 'Monto',
        currency: 'Moneda',
        product: 'Producto',
        quantity: 'Unidades',
        productCategory: 'Familia de producto',
        counterparty: 'Cliente o proveedor',
        issueDate: 'Fecha de emisión',
        dueDate: 'Vencimiento',
      },
      txType: {
        revenue: 'Ingreso',
        cogs: 'Costo directo',
        opex: 'Gasto operativo',
        other: 'Otro',
      },
      empty_value: 'sin dato',
    },
    eyebrow: 'ADMIN',
    title: 'Backoffice',
  },
  shell: {
    mainNav: 'Navegación principal',
    collapse: 'Colapsar menú',
    expand: 'Expandir menú',
    openMenu: 'Abrir menú',
    section: {
      analysis: 'Análisis',
      data: 'Datos',
      account: 'Cuenta',
      operations: 'Operación',
      platform: 'Plataforma',
    },
    nav: {
      dashboard: 'Panorama',
      analytics: 'Analítica',
      productSales: 'Ventas por producto',
      inventory: 'Inventario',
      alerts: 'Alertas',
      upload: 'Cargar datos',
      reports: 'Reportes',
      // "Asesor IA" y no "Asistente": es el nombre del prototipo, y además dice lo que
      // hace. "Asistente" a secas no distingue esta pantalla de cualquier otra ayuda.
      chat: 'Asesor IA',
      credits: 'Créditos',
      members: 'Equipo',
      settings: 'Ajustes',
    },
    adminNav: {
      companies: 'Empresas',
      stagingRows: 'Filas marcadas',
      templates: 'Plantillas',
      plans: 'Planes',
      creditRules: 'Reglas de créditos',
      config: 'Configuración',
      aiCost: 'Costo IA',
      uploads: 'Cargas',
      demoRequests: 'Solicitudes',
    },
  },
  home: {
    eyebrow: 'MACHA FINANCE',
    title: 'Tu capa de CFO',
    subtitle:
      'Sube tu contabilidad, entiende tus números y decide con un asistente financiero que conoce tu empresa.',
    authError: 'No se pudo completar el inicio de sesión. Vuelve a intentarlo.',
  },
  /**
   * ═══════════════════════════════════════════════════════════════════════════════════════════
   * LANDING PÚBLICA (`macha.finance`) — copy tomado del Figma, 2026-08-21
   * ═══════════════════════════════════════════════════════════════════════════════════════════
   *
   * El español es el ORIGINAL: sale del diseño (frame `4:218`, leído por la API de Figma), no de
   * una traducción. El inglés de `en.ts` sí es traducción y está marcado como tal ahí.
   *
   * Va en el diccionario y no quemado en los componentes aunque hoy la landing solo exista en
   * español, por la misma razón que el resto del producto: retrofitear textos después cuesta
   * mucho más que ponerlos acá desde el principio.
   */
  landing: {
    nav: {
      inicio: 'Inicio',
      comoFunciona: 'Cómo funciona',
      planes: 'Planes',
      faq: 'FAQ',
      contacto: 'Contacto',
      demo: 'Solicitar demo',
      /*
        Nombre accesible del disparador del menú en móvil (CU-868kv8m1v). No se pinta:
        el ícono de hamburguesa no le dice nada a un lector de pantalla.
      */
      menu: 'Secciones',
    },
    hero: {
      eyebrow: 'TU CFO IMPULSADO CON IA',
      title: 'Convierte los datos de tu negocio en decisiones inteligentes.',
      subtitle:
        'Centraliza tu información financiera y operativa, obtén insights claros y entiende mejor qué está pasando en tu negocio.',
      demo: 'Solicitar demo',
      how: 'Ver cómo funciona',
      /* Texto alternativo del mockup. No es decoración: describe QUÉ muestra la imagen para
         quien no la puede ver, y un `alt` vacío acá dejaría la única prueba visual del producto
         invisible para un lector de pantalla. */
      mockupAlt:
        'Resumen del panel de Macha: ingresos, margen bruto y flujo de caja del mes, con la gráfica de ingresos y los insights del día.',
    },
    producto: {
      eyebrow: 'EL PRODUCTO',
      title: 'Todo tu negocio en una sola vista.',
      subtitle:
        'Ventas, costos, rentabilidad, inventario y flujo de caja se integran en una misma visión.',
      pestanas: ['Costos', 'Flujo de caja'],
      mockupAlt:
        'Vista de ventas del mes en Macha: el total del período con su variación, la tendencia de los últimos seis meses y el detalle por producto.',
    },
    porque: {
      eyebrow: 'POR QUÉ EXISTE MACHA',
      title: 'Tus datos ya están ahí. El problema es entenderlos.',
      subtitle:
        'La información vive repartida entre archivos, hojas de cálculo y procesos manuales. Preparar reportes toma tiempo y las decisiones llegan tarde.',
      fragmentado: {
        eyebrow: 'INFORMACIÓN FRAGMENTADA',
        hoy: 'HOY',
        filas: [
          { archivo: 'Ventas_agosto_v4.xlsx', estado: 'Actualizado a mano' },
          { archivo: 'Costos_actualizados.xlsx', estado: 'Versión anterior' },
          { archivo: 'Reporte semanal', estado: 'Armado manual' },
          { archivo: 'Inventario_final.xlsx', estado: 'Dos versiones' },
        ],
      },
      centralizado: {
        eyebrow: 'INTELIGENCIA FINANCIERA CENTRALIZADA',
        titulo: 'Información centralizada y unificada',
        colInfo: 'Información',
        colEstado: 'Estado',
        sincronizado: 'Sincronizado',
        filas: [
          { info: 'Ventas', estado: 'Organizado' },
          { info: 'Costo', estado: 'Organizado' },
          { info: 'Inventario', estado: 'Organizado' },
          { info: 'Rentabilidad', estado: 'Organizado' },
        ],
        pie: 'Una sola visión de tu negocio, más clara y fácil de entender.',
      },
    },
    como: {
      eyebrow: '¿CÓMO FUNCIONA?',
      title: 'Tres pasos entre tus datos y tu decisión.',
      flujo: { datos: 'Tus datos', macha: 'Macha Finance', insights: 'Insights y decisiones' },
      pasos: [
        {
          titulo: 'Centraliza tus datos.',
          desc: 'Carga tu información desde Excel, utiliza las plantillas de Macha o ingresa los datos de forma manual.',
        },
        {
          titulo: 'Macha los analiza.',
          desc: 'Macha organiza y analiza tu información para convertir los datos en indicadores claros.',
        },
        {
          titulo: 'Claridad para decidir',
          desc: 'Visualiza dashboards, insights y alertas para entender qué cambió, detectar desvíos y tomar mejores decisiones.',
        },
      ],
    },
    capacidades: {
      eyebrow: 'QUÉ PUEDE HACER MACHA',
      title: 'Cinco formas de entender tu negocio.',
      items: [
        {
          titulo: 'Obtener insights',
          desc: 'Detecta cambios, tendencias y datos relevantes para entender mejor qué está pasando en tu negocio.',
          insights: [
            {
              titulo: 'Tu margen bruto cayó 3.2 puntos en agosto',
              desc: 'El costo de proveedores creció más rápido que los ingresos durante el período.',
              meta: 'Hace 12 minutos · Márgenes',
            },
            {
              titulo: 'La línea Premium sostiene el crecimiento del trimestre',
              desc: 'Aporta el 39% de las ventas con el margen más alto del catálogo.',
              meta: 'Hoy · Ventas',
            },
          ],
        },
        {
          titulo: 'Analizar resultados',
          desc: 'Macha organiza y analiza la información de ventas, costos, gastos e inventario para transformarla en datos claros.',
          insights: [
            {
              titulo: 'Tus ventas muestran una tendencia positiva',
              desc: 'Los resultados mejoraron respecto al período anterior.',
              meta: 'Ventas · Resultados',
            },
            {
              titulo: 'Tus costos están creciendo más rápido que tus ingresos',
              desc: 'La diferencia está reduciendo la rentabilidad del negocio.',
              meta: 'Costos · Resultados',
            },
          ],
        },
        {
          titulo: 'Identificar oportunidades',
          desc: 'Identifica productos, categorías o áreas con potencial para crecer, mejorar márgenes o aumentar rentabilidad.',
          insights: [
            {
              titulo: 'Hay áreas con mayor potencial de crecimiento',
              desc: 'El análisis permite identificar dónde se están generando mejores oportunidades.',
              meta: 'Crecimiento · Oportunidades',
            },
            {
              titulo: 'Existe potencial para mejorar los márgenes',
              desc: 'Macha identifica áreas donde el rendimiento puede optimizarse.',
              meta: 'Rentabilidad · Oportunidades',
            },
          ],
        },
        {
          titulo: 'Automatizar reportes',
          desc: 'Genera automáticamente reportes claros y a medida, sin perder tiempo preparando información.',
          insights: [
            {
              titulo: 'Tu reporte está listo',
              desc: 'La información fue organizada automáticamente para facilitar su análisis.',
              meta: 'Reportes · Automatización',
            },
            {
              titulo: 'Reporte actualizado',
              desc: 'Los principales indicadores están organizados en una misma vista.',
              meta: 'Reportes · Información',
            },
          ],
        },
        {
          titulo: 'Detectar cambios importantes',
          desc: 'Recibe alertas cuando Macha identifica variaciones relevantes en ventas, costos, inventario o márgenes.',
          insights: [
            {
              titulo: 'Se detectó una variación en tus costos',
              desc: 'Macha identificó un cambio relevante respecto al período anterior.',
              meta: 'Costos · Alerta',
            },
            {
              titulo: 'Tus ventas presentan un cambio relevante',
              desc: 'La variación fue detectada para que puedas analizar qué está ocurriendo.',
              meta: 'Ventas · Alerta',
            },
          ],
        },
      ],
    },
    asesor: {
      eyebrow: 'TU CFO CON IA',
      title: 'Tu negocio tiene preguntas. Macha tiene contexto.',
      subtitle:
        'Pregunta en lenguaje natural. Macha responde con tus propios números, explica el porqué y te ayuda a decidir.',
      preguntas: [
        {
          q: '¿Por qué bajó mi margen este mes?',
          a: 'Tu margen bruto pasó de 41.1% a 38.6%. La principal variación proviene del aumento en costos de proveedores.',
        },
        {
          q: '¿Qué producto es más rentable?',
          a: 'La Línea Premium es tu producto más rentable y también concentra el mayor volumen de ventas.',
        },
        {
          q: '¿Dónde están aumentando mis costos?',
          a: 'El mayor aumento se concentra en proveedores e insumos, lo que está impactando directamente tu margen.',
        },
      ],
    },
    automatizacion: {
      eyebrow: 'AUTOMATIZACIÓN E INTELIGENCIA',
      title: 'Lo que tomaba horas, ahora ocurre en segundos.',
      subtitle:
        'Macha analiza tus indicadores, genera reportes y detecta cambios relevantes para que puedas actuar a tiempo.',
      etapas: [
        { titulo: 'Cambios en ventas', sub: 'Semanal' },
        { titulo: 'Aumentos de costos', sub: 'Detección' },
        { titulo: 'Variaciones de margen', sub: 'Análisis' },
        { titulo: 'Reportes automáticos', sub: 'Generación' },
      ],
      panel: {
        titulo: 'Alertas',
        items: [
          {
            titulo: 'Costo de proveedores +14.6%',
            desc: 'Los costos de proveedores aumentaron frente al período anterior.',
          },
          {
            titulo: 'Ventas de mayoreo -2.1%',
            desc: 'Las ventas registraron una variación negativa frente al período anterior.',
          },
          {
            titulo: 'Reporte generado',
            desc: 'El reporte del período está listo para consultar.',
            meta: 'Reportes',
          },
        ],
      },
    },
    antesDespues: {
      eyebrow: 'ANTES Y DESPUÉS CON MACHA',
      title: 'La misma información, otra forma de trabajar.',
      antesEyebrow: 'ANTES DE MACHA',
      conEyebrow: 'CON MACHA',
      pares: [
        { antes: 'Información dispersa', con: 'Información centralizada' },
        { antes: 'Reportes manuales', con: 'Automatización' },
        { antes: 'Datos difíciles de interpretar', con: 'Insights claros' },
        { antes: 'Cambios detectados tarde', con: 'Alertas oportunas' },
      ],
    },
    seguridad: {
      eyebrow: 'SEGURIDAD',
      title: 'Tus datos son tuyos. Siempre.',
      items: [
        {
          titulo: 'Conexiones seguras',
          desc: 'Macha se conecta a tus fuentes mediante conexiones cifradas.',
        },
        { titulo: 'Información cifrada', desc: 'Tus datos viajan y se almacenan cifrados.' },
        {
          titulo: 'Acceso controlado',
          desc: 'Tú defines quién de tu equipo ve qué información.',
        },
        {
          titulo: 'Sin terceros',
          desc: 'Tu información financiera no se comparte con terceros.',
        },
      ],
    },
    planes: {
      eyebrow: 'PLANES',
      title: 'Un plan según tu operación.',
      nota: 'Definimos el alcance en la demo, según tus fuentes de datos y el tamaño de tu equipo.',
      cta: 'Solicitar demo',
      items: [
        {
          nombre: 'Base',
          para: 'Para negocios que empiezan a ordenar sus finanzas.',
          precio: '$59 + IVA',
          incluye: ['Dashboard financiero', 'Insights automáticos', 'Conexión con Excel'],
        },
        {
          nombre: 'Pro',
          para: 'Para operaciones con varias fuentes de datos y equipos.',
          precio: '$139 + IVA',
          incluye: [
            'Todo lo de Base',
            // Sin "y bancos" (Jose, 2026-08-26): el producto no conecta con ningún banco, y
            // prometerlo en la pantalla donde el cliente decide si paga es vender lo que no hay.
            'Conexión con ERP',
            'Reportes y alertas automáticas',
            'Accesos por usuario',
          ],
        },
        {
          nombre: 'Personalizado',
          para: 'Para grupos con necesidades específicas de integración.',
          incluye: [
            'Integraciones a medida',
            'Modelos y reportes propios',
            'Acompañamiento dedicado',
          ],
        },
      ],
    },
    faq: {
      eyebrow: 'PREGUNTAS FRECUENTES',
      title: 'Antes de la demo.',
      items: [
        {
          q: '¿Qué es Macha Finance?',
          a: 'Una plataforma de inteligencia financiera con IA. Centraliza la información financiera y operativa de tu negocio y la convierte en indicadores, insights y reportes claros.',
        },
        {
          q: '¿Qué datos necesito para empezar?',
          a: 'Principalmente, información de ventas, costos y gastos desde Excel o tu ERP. También puedes incorporar inventario.',
        },
        {
          q: '¿Funciona con mi Excel y mi ERP?',
          a: 'Sí. Puedes cargar información desde Excel y, dependiendo de tu sistema, conectar Macha con tu ERP.',
        },
        {
          q: '¿Cuánto tarda la implementación?',
          a: 'Depende de la cantidad y estructura de tus datos. Con archivos de Excel organizados puedes comenzar rápidamente.',
        },
        {
          q: '¿Cómo se protege mi información?',
          a: 'Tu información se mantiene separada por empresa y con accesos controlados. Macha utiliza conexiones cifradas.',
        },
        {
          q: '¿Qué acompañamiento recibo?',
          a: 'Te acompañamos durante la configuración inicial, la organización de tus datos y la puesta en marcha.',
        },
      ],
    },
    cta: {
      title: 'Empieza a entender mejor tu negocio.',
      subtitle: 'Descubre cómo Macha puede convertir tus datos en decisiones más claras.',
      demo: 'Solicitar demo',
    },
    form: {
      title: 'Empieza a entender mejor tu negocio.',
      subtitle: 'Déjanos tus datos y te contactamos para una demo.',
      name: 'Nombre',
      company: 'Empresa',
      email: 'Correo',
      phone: 'Teléfono (opcional)',
      message: 'Cuéntanos sobre tu empresa (opcional)',
      submit: 'Solicitar demo',
      submitting: 'Enviando…',
      success: 'Recibimos tu solicitud. Te contactamos pronto.',
      error: 'No pudimos enviar la solicitud. Intenta de nuevo en un momento.',
      rateLimited: 'Hay demasiadas solicitudes desde tu red. Intenta mañana.',
    },
    footer: {
      tagline: 'Inteligencia financiera impulsada por IA.',
      privacidad: 'Aviso de privacidad',
      terminos: 'Términos',
      datos: 'Política de datos',
      copyright: '© 2026 Macha Finance',
    },
    /* Asunto del correo del CTA. Prellenarlo es la diferencia entre un correo que se contesta y
       uno que llega sin contexto: quien escribe no tiene que explicar de dónde salió. */
    demoAsunto: 'Solicitar demo de Macha Finance',
  },
  upload: {
    confirmacion: {
      eyebrow: 'ANTES DE PUBLICAR',
      title: 'Esto entendimos de tu archivo',
      subtitle:
        'Revisa que sea correcto y publícalo. Nada entra a tus reportes hasta que lo confirmes.',
      sheetsTitle: 'Qué hicimos con cada hoja',
      usada: '{n} movimientos · {monto}',
      noUsada: 'No la usamos',
      inventario: 'Actualizó tu inventario',
      excluir: 'Esta no debería contar',
      excluida: 'No se va a contar',
      deshacer: 'Volver a incluirla',
      conceptosTitle: 'Y solo tú sabes qué es esto',
      conceptosHint:
        'Quedaron {n} conceptos por clasificar. Puedes publicar sin contestarlos y hacerlo después.',
      publicar: 'Todo correcto, publicar',
      publicando: 'Publicando…',
      publicado: 'Listo: tus datos ya están en el dashboard.',
      error: 'No se pudo publicar. Intenta de nuevo.',
      pendiente: 'Esta carga está esperando tu confirmación.',
    },
    conceptos: {
      cta: 'Ayúdanos a clasificar {n} concepto(s)',
      ctaSinConteo: 'Ayúdanos a clasificar tus conceptos',
      /*
       * El encabezado dice POR QUÉ se pregunta, no solo qué. "No pudimos clasificar" suena a
       * fallo nuestro y pone al cliente a la defensiva; "solo tú sabes qué es" es literalmente
       * cierto —es su libro, sus proveedores— y convierte la pregunta en algo que vale
       * contestar.
       */
      // SINGULAR desde CU-868kyur58: la tarjeta pregunta un concepto a la vez, así que
      // "estos" ya no describe lo que el cliente tiene delante.
      title: 'Solo tú sabes qué es esto',
      subtitle:
        'Cada respuesta ordena todas las filas con ese concepto, y no te lo volvemos a preguntar en las próximas cargas.',
      rows: '{n} filas · {monto}',
      typeLabel: 'Qué es',
      categoryLabel: 'Rubro',
      categoryPlaceholder: 'Ej. servicios, transporte, nómina',
      type: {
        revenue: 'Un ingreso',
        cogs: 'Un costo de lo que vendo',
        opex: 'Un gasto de operación',
        other: 'Otro movimiento',
      },
      /*
       * El ejemplo bajo cada opción, del HTML aprobado por Jose. Es lo que hace contestable la
       * pregunta sin saber contabilidad: "un costo de lo que vendo" es ambiguo para quien lleva
       * una tienda; "solo lo que costó producir o comprar" no lo es. Y es la misma frontera
       * cogs/opex que el prompt define para el modelo, dicha en el idioma del dueño.
       */
      typeHint: {
        revenue: 'Dinero que entra por ventas',
        cogs: 'Solo lo que costó producir o comprar',
        opex: 'Renta, planilla, servicios',
        other: 'Ninguno de los anteriores',
      },
      /** Lleva `{siguiente}`: el concepto al que pasa. Nombrarlo evita el "¿cuánto falta?". */
      submitNext: 'Guardar y seguir → «{siguiente}»',
      /** Sin `{siguiente}`: es el último. */
      submitLast: 'Guardar',
      skip: 'Omitir por ahora',
      /** Lleva `{n}` y `{total}`. Para lectores de pantalla; en pantalla son los puntos. */
      progress: 'Concepto {n} de {total}',
      submit: 'Guardar y aplicar',
      submitting: 'Guardando…',
      // Se dice cuántas filas se acomodaron, no un "listo" a secas: es la prueba de que
      // contestar cambió algo, que es justamente lo que la pantalla tiene que demostrar.
      done: 'Listo. Acomodamos {n} filas de esta carga.',
      error: 'No se pudo guardar. Vuelve a intentarlo.',
      empty: 'No quedó nada por clasificar en esta carga.',
    },
    readSummary: {
      cta: 'Ver qué entendimos de tu archivo',
      empty: 'Esta carga es anterior a esta función, así que no guardamos el detalle.',
      sheetMovements: '· {n} movimientos',
      sheetCost: 'Costo declarado en el archivo: {monto}',
      sheetInventory: '· {creados} artículos nuevos, {ajustados} ajustados',
      reason: {
        catalogo:
          '· no se leyó: describe tus clientes, productos o proveedores, no movimientos ({n} filas)',
        reporte: '· no se leyó: es un reporte con los datos a lo ancho, no una tabla ({n} filas)',
        duplica_otra_hoja:
          '· no se leyó: repite el mismo dinero que otra hoja, y contarlo dos veces inflaría tus cifras ({n} filas)',
        ya_ingerida: '· ya la teníamos completa de una carga anterior ({n} filas)',
        vacia: '· no tiene filas que leer',
        sin_fecha_ni_monto:
          '· no se leyó: no encontramos una columna de fecha con montos al lado, así que sus filas no son movimientos ({n} filas)',
      },
      sheetSkippedMoney: 'No entró a tus números: {monto}',
      totals: 'Entraron {movimientos} movimientos. No se leyeron {descartadas} filas.',
    },
    eyebrow: 'INGESTA',
    title: 'Cargar datos',
    subtitle: 'Sube tu Excel/CSV contable y sigue su procesamiento.',
    dropzoneCta: 'Arrastra tu archivo aquí o haz clic para buscarlo',
    dropzoneHint: '.xlsx, .xls o .csv',
    downloadTemplate: 'Descargar plantilla',
    // La plantilla es OPCIONAL: el motor clasifica el archivo que tengas, con el orden
    // que tenga. Se dice explícito porque un botón de "descargar plantilla" junto a un
    // dropzone se lee como "primero llena esto", que es justo lo que no queremos.
    downloadTemplateHint:
      'Opcional: sube tu archivo tal como lo llevas. La plantilla es solo un punto de partida si no llevas un orden definido.',
    empty: 'Todavía no has subido ningún archivo.',
    revert: 'Revertir',
    reverting: 'Revirtiendo…',
    retry: 'Reintentar',
    retrying: 'Reintentando…',
    unsupportedCta: 'Usar la plantilla',
    revertConfirm:
      '¿Revertir esta carga? Se eliminarán todos los movimientos, facturas y cuentas por pagar que generó. La acción queda registrada y no se puede deshacer desde la aplicación.',
    cancel: 'Cancelar',
    cancelling: 'Cancelando…',
    cancelConfirm:
      '¿Cancelar esta carga? Lo que ya se procesó queda guardado, así que si vuelves a subir el mismo archivo solo se cobrará lo que falte.',
    loadMore: 'Cargar más',
    table: {
      file: 'Archivo',
      status: 'Estado',
      date: 'Fecha',
    },
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
      // No dice "Error": el archivo no está roto, simplemente no es un libro que se
      // pueda leer. Culpar al archivo del cliente por algo que no es una falla suya
      // invita a reintentar, que es justo lo que no sirve acá.
      unsupported: 'No legible',
      cancelled: 'Cancelado',
      awaiting_confirmation: 'Esperando tu confirmación',
    },
  },
  dashboard: {
    eyebrow: 'DASHBOARD',
    title: 'Panorama financiero',
    greetingMorning: 'Buenos días',
    greetingAfternoon: 'Buenas tardes',
    greetingEvening: 'Buenas noches',
    greetingSubtitle: 'Así va tu negocio {period}.',
    greetingPeriod: {
      today: 'hoy',
      week: 'esta semana',
      month: 'este mes',
      lastMonth: 'el mes pasado',
      quarter: 'este trimestre',
      year: 'este año',
      // Con preposición: "Así va tu negocio el rango elegido" no se lee.
      custom: 'en el rango elegido',
    },
    importCta: 'Importar Excel',
    period: {
      label: 'Período',
      today: 'Hoy',
      week: 'Esta semana',
      month: 'Este mes',
      lastMonth: 'Mes pasado',
      quarter: 'Este trimestre',
      year: 'Este año',
      showing: 'Mostrando',
      vsPrevious: 'vs. período anterior',
      custom: 'Personalizado',
      customFrom: 'Desde',
      customTo: 'Hasta',
      customApply: 'Aplicar',
      customIncomplete: 'Elige las dos fechas.',
      customReversed: 'La fecha final no puede ser anterior a la inicial.',
      customFuture: 'No puedes elegir fechas futuras.',
      /*
       * Ventanas MÓVILES, que es lo que las píldoras no cubren: ellas dan períodos de
       * calendario ("este mes") y estas contestan "¿cómo vengo últimamente?". Se escriben
       * "Últimos N días" y no "N días" porque lo segundo no dice desde cuándo se cuenta.
       */
      last7: 'Últimos 7 días',
      last30: 'Últimos 30 días',
      last90: 'Últimos 90 días',
      /*
       * El TAMAÑO de lo elegido, antes de aplicarlo. Van DOS plantillas porque el singular
       * cambia la palabra ("1 día", no "1 días"); ver el porqué de que no sea una función
       * en `dictionary.ts`. De paso el singular queda bien concordado: la versión función
       * dejaba "1 día seleccionadOS".
       */
      customSpanOne: '{n} día seleccionado',
      customSpanOther: '{n} días seleccionados',
      dataSpan: 'Datos: {from} – {to}',
    },
    emptyPeriod: {
      outsideRange:
        'No hay movimientos en este período. Los tuyos van del {from} al {to} — cambia el filtro para verlos.',
      noDataAtAll: 'Todavía no hay movimientos en esta cuenta. Importa un Excel para empezar.',
    },
    topProduct: {
      title: 'Producto que más vendió',
      emptyNoSales: 'No hubo ventas en este período.',
      emptyUnattributed:
        'Hubo ventas, pero ninguna quedó asociada a un producto. Las cargas anteriores a la última actualización no traen ese dato.',
    },
    currency: {
      title: 'Monedas del período',
      consolidatedIn: 'Tus cifras están consolidadas en {currency}.',
      ownCurrency: 'en tu moneda base',
      contributed: 'aportó {amount}',
      rateApplied: 'Tasa aplicada: {rate} · {date}',
      rateRange: 'Tasas entre {min} y {max} · la última, {latest} el {date}',
      notSummed:
        'Los montos de arriba están en monedas distintas y no se suman entre sí; lo que se consolida es lo que cada una aportó en {currency}.',
    },
    viewCurrency: {
      label: 'Ver en',
      /* El aviso vive junto a las cifras convertidas y no en un tooltip: quien lee un número
         convertido tiene que ver de dónde salió sin tener que buscarlo. */
      convertedAt: 'Convertido a {currency} con la tasa {rate} del {date}.',
      notAccounting:
        'Es solo una vista: tu contabilidad sigue registrada en {currency} con la tasa de cada movimiento.',
      /* El estado que dispara el flujo: no hay tasa, así que en vez de convertir se invita a
         configurarla. El texto nombra la pantalla porque el botón lleva ahí. */
      missingRate: 'Configura tu tipo de cambio para ver estas cifras en {currency}.',
      configure: 'Configurar tipo de cambio',
    },
    kpi: {
      revenue: 'Ingresos',
      revenueHint: 'Ingresos facturados del período.',
      expenses: 'Gastos operativos',
      expensesHint: 'Nómina, renta y demás. No incluye el costo de lo vendido.',
      grossProfit: 'Utilidad bruta',
      grossProfitHint: 'Ventas menos costo directo.',
      cashFlow: 'Resultado del período',
      cashFlowHint: 'Ventas menos todos los gastos.',
      // CU-868krkqh2: decía "vs. mes anterior" SIEMPRE, incluso con el filtro en "Este año"
      // (se ve en la captura del reporte de Macha). El backend nunca compara contra el mes
      // pasado: compara contra la ventana del MISMO tamaño justo anterior — un año contra el
      // año previo, un día contra el día previo (ver `ventanaAnterior` en el backend). El pie
      // afirmaba una comparación que el número no era.
      vsPrevious: 'vs. período anterior',
      vsPreviousPp: 'puntos vs. período anterior',
      // CU-868kh8y58: "directo" no es adorno — la decisión de Jose define `cogs` como
      // SOLO el costo directo de lo vendido. El alquiler y la planilla son `opex` y no
      // entran acá, y la etiqueta tiene que decirlo para que el dueño no lo lea al revés.
      cogs: 'Costo directo de ventas',
      cogsHint: 'Solo lo que costó la mercadería vendida. No incluye alquiler ni planilla.',
      margin: 'Margen bruto',
      marginHint: 'Lo que te queda de cada venta antes de los gastos fijos.',
    },
    trendTitle: 'Tendencia mensual',
    ingest: {
      eyebrow: 'CARGA EN PROCESO',
      processing: 'Estamos procesando {docs} archivo(s). Tus números aparecen cuando termine.',
      inReview:
        'Tienes {docs} carga(s) con algo pendiente. El resto de sus datos ya está en tus números.',
      inReviewWithRows:
        'Tienes {docs} carga(s) con {rows} filas pendientes de clasificar. El resto ya está en tus números.',
      explainer:
        'Lo que se leyó bien ya entró a tus reportes. Solo esperan las filas que no logramos clasificar: en cuanto nos digas qué son, se suman.',
      cta: 'Ver mis cargas',
    },
    arApTitle: 'Cuentas por cobrar / pagar',
    ar: 'Por cobrar',
    ap: 'Por pagar',
    chart: {
      period: 'Periodo',
      aging: 'Antigüedad',
    },
    insightCategory: {
      cashflow: 'Flujo de caja',
      revenue: 'Ingresos',
      expenses: 'Gastos',
      collections: 'Cobranza',
      financial: 'Financiero',
      sales: 'Ventas',
    },
    /*
     * Severidad del consejo (CU-868ku6r48). Los CÓDIGOS los manda el backend; acá solo se
     * nombran, igual que con `insightCategory` y con `ruleKey` de las alertas.
     *
     * "Urgente" y no "Crítico": el rótulo lo lee el dueño de una PYME sobre su propio negocio, y la
     * palabra tiene que decirle qué hacer con ella —mirar esto hoy— y no calificar su empresa.
     */
    insightSeverity: {
      critical: 'Urgente',
      warning: 'Atención',
      info: 'Contexto',
    },
    insightTitle: 'CONSEJO FINANCIERO DIARIO',
    insightCta: 'Generar consejo',
    insightLoading: 'Generando…',
    insightIdle: 'Macha lee tus últimos tres meses y te dice qué hacer con lo que encuentre.',
    insightInsufficientCredits: 'Saldo de créditos insuficiente para generar un insight.',
    insightError: {
      insufficientDetail: 'Necesitas {required} créditos y tienes {balance}.',
      rateLimited: 'Hay demasiadas solicitudes en curso. Intenta en un momento.',
      failed: 'No pudimos generar el insight. Tu saldo no se vio afectado.',
      retry: 'Reintentar',
    },
    creditsLabel: 'créditos',
    keyAlerts: {
      title: 'ALERTAS ACTIVAS',
      triggered: 'Llegó a {value} {unit}, con el umbral en {threshold}.',
      empty: 'Ninguna alerta activa por ahora.',
      loadFailed: 'No pudimos cargar tus alertas. Esto no significa que no tengas ninguna.',
      seeAll: 'Ver el histórico completo',
    },
  },
  settings: {
    title: 'Ajustes',
    subtitle: 'La configuración de tu empresa en Macha.',
    fx: {
      title: 'Tipo de cambio',
      subtitle: 'La tasa con la que se convierte a {base} lo que cargas en {quote}.',
      current: 'Vigente',
      since: 'desde el {date}',
      none: 'Sin tasa registrada: lo que subas en otra moneda queda pendiente de revisión.',
      notRetroactive:
        'Cambiar la tasa no modifica lo que ya cargaste: cada movimiento guarda la tasa con la que entró. La tasa nueva aplica de aquí en adelante.',
      rateLabel: 'Cuántos {base} por 1 {quote}',
      dateLabel: 'Vigente desde',
      save: 'Guardar tasa',
      saved: 'Tasa guardada.',
      invalid: 'La tasa tiene que ser un número mayor que 0.',
      readOnly: 'Solo el dueño y los administradores pueden cambiar la tasa.',
      history: 'Tasas anteriores',
    },
  },
  chat: {
    eyebrow: 'ASISTENTE CFO',
    title: 'Chat',
    newChat: 'Nuevo chat',
    placeholder: 'Pregunta sobre tus finanzas…',
    send: 'Enviar',
    sending: 'Enviando…',
    threads: 'Conversaciones',
    openThreads: 'Ver conversaciones',
    noThreads: 'Todavía no tienes conversaciones.',
    composerHint: 'Enter envía · Mayús+Enter salta de línea',
    thinking: 'Macha está pensando…',
    stopWaiting: 'Cancelar',
    stoppedWaiting: 'Cancelaste la respuesta. Tu pregunta quedó guardada en el chat.',
    insufficientCredits:
      'Te quedaste sin créditos, así que este mensaje no se envió. Tu texto sigue acá.',
    topUp: 'Comprar créditos',
    welcome: {
      title: '¿Qué quieres saber de tu negocio?',
      subtitle:
        'Pregunta en tus palabras. Respondo con los datos que ya cargaste, nunca con estimaciones.',
      quickLabel: 'Para empezar',
      listeningLabel: 'Escuchando…',
      q1: '¿Cómo está mi flujo de caja este mes?',
      q2: '¿Qué producto me deja más margen?',
      q3: '¿En qué gasté más que el mes pasado?',
      q4: '¿Qué facturas tengo vencidas?',
    },
  },
  reports: {
    eyebrow: 'REPORTES',
    title: 'Reportes ejecutivos',
    empty: 'Todavía no hay reportes generados.',
    viewRendered: 'Ver versión final',
    downloadPdf: 'Descargar PDF',
    downloadExcel: 'Descargar Excel',
    builder: {
      title: 'Arma un reporte con IA',
      subtitle: 'Elige el período y qué quieres que incluya. Se genera y aparece abajo.',
      readOnly: 'Solo el propietario y los administradores pueden generar reportes.',
      typeLabel: 'Tipo de reporte',
      type: {
        executive_summary: 'Resumen ejecutivo',
        financial_performance: 'Desempeño financiero',
        cost_analysis: 'Análisis de costos',
        sales_performance: 'Ventas y productos',
      },
      // CU-868ktkn9w: qué sale del otro lado, no cómo se llama. Nombra las tres cosas que
      // el tipo produce de verdad —cifras del período, lectura y recomendaciones— para que
      // la decisión de gastar créditos se tome sabiendo qué se recibe.
      typeDescription: {
        executive_summary:
          'Las cifras del período con la lectura de un CFO: qué pasó, por qué, y qué conviene hacer.',
        financial_performance:
          'La comparación contra el período anterior: qué se movió en ingresos, costos y margen, y qué lo explica.',
        cost_analysis:
          'En qué se está yendo el dinero: qué categorías pesan más, cuáles se movieron y qué riesgos hay.',
        sales_performance:
          'Qué se vendió y qué producto manda, con la tendencia de la venta en el período.',
      },
      sectionsLabel: 'Qué incluir',
      sectionsRequired: 'Elige al menos una sección.',
      instructionsLabel: 'Algo más que quieras pedirle (opcional)',
      instructionsPlaceholder: 'Enfócate en el margen de la línea de bebidas.',
      // CU-868kt96fw: `{sections}` se rellena con los nombres de las secciones SIN marcar.
      instructionsScope:
        'Lo que pidas solo puede salir de las secciones marcadas arriba. Ahora mismo están sin marcar: {sections}.',
      instructionsScopeAll:
        'Están marcadas todas las secciones, así que puedes pedir sobre cualquiera.',
      generate: 'Generar reporte',
      generating: 'Enviando…',
      queued: 'Tu reporte quedó en cola y usó {n} créditos. Aparecerá abajo en cuanto esté listo.',
      error: 'No pudimos generar el reporte. Intenta de nuevo.',
      insufficientCredits:
        'Necesitas {required} créditos para este reporte y tienes {balance}. Recarga desde Plan y créditos.',
      queueFull: 'Hay demasiados trabajos en curso. Intenta de nuevo en unos minutos.',
    },
    edit: 'Editar narrativa',
    save: 'Guardar como nueva versión',
    saving: 'Guardando…',
    saved: 'Guardado',
    askInChat: 'Preguntar en el chat',
    chatThreadTitle: 'Reporte',
    loadMore: 'Cargar más',
    kpi: {
      revenue: 'Ingresos',
      cogs: 'Costo directo de ventas',
      margin: 'Margen bruto',
      arOpen: 'Por cobrar abierto',
      apOpen: 'Por pagar abierto',
    },
    frequencyValue: {
      daily: 'Diario',
      weekly: 'Semanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
    },
    downloadHeader: {
      title: 'Descargar tu último reporte',
      subtitle: 'Baja el reporte más reciente que generaste, en PDF o en Excel.',
      empty: 'Genera un reporte abajo y podrás descargarlo desde aquí.',
    },
    baseCurrencyLabel: 'Moneda base',
    historyTitle: 'Historial de reportes',
    table: {
      period: 'Periodo',
      frequency: 'Frecuencia',
      updated: 'Actualizado',
      status: 'Estado',
    },
    status: {
      ready: 'Listo',
      generating: 'Generándose',
      generatingHint: 'Estamos escribiendo este reporte. Aparecerá aquí al terminar.',
      notGenerated: 'No se completó',
      notGeneratedHint: 'Vuelve a generarlo para tener este periodo.',
    },
  },
  alerts: {
    eyebrow: 'ALERTA',
    title: 'Detalle de alerta',
    historyEyebrow: 'ALERTAS',
    historyTitle: 'Histórico de alertas',
    table: {
      rule: 'Regla',
      triggeredValue: 'Valor',
      threshold: 'Umbral',
      date: 'Fecha',
    },
    empty: 'Todavía no se ha disparado ninguna alerta.',
    notFound: 'No encontramos esta alerta.',
    triggeredValue: 'Valor que la disparó',
    threshold: 'Umbral configurado',
    triggeredAt: 'Fecha',
    sourceDocument: 'Carga que la originó',
    noSourceDocument: 'Sin carga asociada',
    backToDashboard: 'Volver al panorama',
    loadMore: 'Cargar más',
    rule: {
      ar_overdue: 'Cobro vencido',
      portfolio_concentration: 'Concentración de cartera',
      revenue_drop: 'Caída de ingresos',
      margin_drop: 'Margen bajo',
      spend_out_of_range: 'Gasto fuera de rango',
      low_credit_balance: 'Saldo de créditos bajo',
    },
    unit: {
      days: 'días',
      percent: '%',
    },
    config: {
      tabHistory: 'Histórico',
      tabConfig: 'Configuración',
      title: 'Cuándo quieres que te avisemos',
      subtitle:
        'Ajusta el número de cada regla o apágala si no aplica a tu negocio. Los cambios entran de inmediato.',
      thresholdLabel: 'Avísame en',
      enabledOn: 'Activa',
      enabledOff: 'Apagada',
      save: 'Guardar',
      saving: 'Guardando…',
      saved: 'Guardado',
      saveFailed: 'No pudimos guardar el cambio. Intenta de nuevo.',
      notifyImmediately: 'Te llega un correo al instante',
      notifyBatched: 'Se resume en tu reporte',
      readOnly:
        'Solo el propietario y los administradores pueden cambiar estas reglas. Estos son los valores con los que trabaja tu empresa.',
      empty: 'Tu empresa todavía no tiene reglas de alerta configuradas.',
      description: {
        ar_overdue:
          'Te avisamos cuando una factura por cobrar pasa este número de días desde su vencimiento.',
        portfolio_concentration:
          'Te avisamos cuando un solo cliente concentra más de este porcentaje de todo lo que te deben.',
        revenue_drop:
          'Te avisamos cuando los ingresos del mes caen más de este porcentaje frente al promedio de los tres meses anteriores.',
        margin_drop:
          'Te avisamos cuando tu margen bruto del período (ingresos menos costo directo) baja de este porcentaje.',
        spend_out_of_range:
          'Te avisamos cuando una categoría de gasto supera su promedio de tres meses en más de este porcentaje. Necesita al menos tres meses de historia cargada.',
        low_credit_balance:
          'Te avisamos cuando te queda menos de este porcentaje de los créditos de tu asignación mensual.',
      },
    },
  },
  onboarding: {
    eyebrow: 'CONFIGURACIÓN',
    title: 'Enséñanos cómo son tus archivos',
    subtitle:
      'Sube el Excel con el que ya llevas tus finanzas. Aprendemos cómo están armadas sus columnas una sola vez, y a partir de ahí cada carga se lee igual.',
    whyTitle: 'Por qué empezar por aquí',
    why1: 'Aprendemos tus columnas una vez. Las cargas siguientes ya no tienen que adivinar.',
    why2: 'Si algún día cambian de lugar, te avisamos — en vez de leer el número equivocado en silencio.',
    why3: 'Es el mismo archivo que subirías después. No es un paso extra: es el primero.',
    uploadedTitle: 'Listo, ya lo estamos procesando',
    uploadedBody:
      'Puedes seguir a tu panel; te avisamos cuando termine. Si el archivo trae varias hojas, cada una se analiza por separado.',
    goToDashboard: 'Ir a mi panel',
    skip: 'Omitir por ahora',
    skipHint:
      '¿Todavía no llevas tus finanzas en un Excel? Entra y súbelo cuando lo tengas, desde Carga de datos.',
  },
  register: {
    eyebrow: 'REGISTRO',
    title: 'Crea tu empresa',
    subtitle: 'Completa estos datos para activar tu cuenta y contratar el plan.',
    name: 'Nombre de tu negocio',
    industry: 'Industria',
    industryPlaceholder: 'Elige tu industria',
    baseCurrency: 'Moneda base',
    locale: 'Idioma',
    planEyebrow: 'TU PLAN',
    companyEyebrow: 'TU EMPRESA',
    companyTitle: 'Datos de tu negocio',
    planTitle: 'Elige tu plan',
    planSubtitle: 'Puedes cambiarlo cuando quieras desde tu cuenta.',
    planCredits: '{n} créditos',
    planFree: 'Gratis',
    planPerMonth: 'al mes',
    planRecommended: 'Recomendado',
    plansUnavailable:
      'No hay planes disponibles ahora mismo. Escríbenos y te damos de alta, o recarga en un momento.',
    submit: 'Continuar al pago',
    submitFree: 'Crear mi empresa',
    submitting: 'Creando…',
    error: 'No se pudo completar el registro. Intenta de nuevo.',
    rateLimited:
      'Has intentado crear demasiadas empresas seguidas. Espera unos minutos e inténtalo de nuevo (o entra a la que ya tienes).',
    noMembershipsTitle: 'Todavía no tienes una empresa',
    noMembershipsSubtitle: 'Completa el registro para empezar a usar Macha Finance.',
    noMembershipsCta: 'Registrar mi empresa',
  },
  credits: {
    eyebrow: 'PLAN',
    title: 'Plan y créditos',
    subtitle: 'Tu plan, lo que incluye, y cómo sumar créditos cuando se te acaben.',
    topUpTitle: 'Comprar créditos sueltos',
    currentBalance: 'Saldo actual',
    creditsLabel: 'créditos',
    quantity: 'Cantidad de créditos',
    pricePerCredit: 'Precio por crédito',
    submit: 'Ir a pagar',
    submitting: 'Procesando…',
    error: 'No se pudo iniciar la recarga. Intenta de nuevo.',
    notOwner: 'Solo el propietario de la empresa puede comprar créditos.',
    topUpCta: 'Comprar créditos',
    plan: {
      title: 'Tu plan',
      subtitle: 'Compara los planes y cambia cuando quieras. El cambio aplica de inmediato.',
      readOnly:
        'Solo el propietario puede cambiar de plan. Este es el plan con el que trabaja tu empresa.',
      currentEyebrow: 'PLAN ACTUAL',
      currentBadge: 'Actual',
      includedCredits: 'Incluye {n} créditos',
      free: 'Gratis',
      perMonth: 'al mes',
      choose: 'Cambiar a este plan',
      changing: 'Cambiando…',
      changeFailed: 'No pudimos cambiar tu plan. Intenta de nuevo.',
      noChargeNote:
        'Por ahora el cambio de plan no genera ningún cobro: los precios todavía se están definiendo.',
      loadError: {
        network: 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.',
        server: 'No pudimos cargar tu plan. Intenta de nuevo en un momento.',
        forbidden: 'No tienes acceso a esta información.',
        retry: 'Reintentar',
      },
    },
  },
  members: {
    eyebrow: 'EQUIPO',
    title: 'Equipo de la empresa',
    subtitle: 'Invita a tu contadora o a tu socio, y decide qué puede hacer cada quien.',
    inviteTitle: 'Invitar a alguien',
    inviteHint:
      'Le llega un correo con un enlace que vence en 7 días. Solo la persona con ese correo puede aceptarlo.',
    emailLabel: 'Correo',
    emailPlaceholder: 'persona@empresa.com',
    roleLabel: 'Rol',
    inviteAction: 'Enviar invitación',
    inviteSent: 'Invitación enviada.',
    membersTitle: 'Miembros',
    pendingTitle: 'Invitaciones pendientes',
    pendingEmpty: 'No hay invitaciones pendientes.',
    colPerson: 'Persona',
    colRole: 'Rol',
    colStatus: 'Estado',
    removeAction: 'Quitar',
    revokeAction: 'Revocar',
    genericError: 'No se pudo completar la acción. Intenta de nuevo.',
    role: { owner: 'Dueño', admin: 'Administrador', member: 'Miembro' },
    status: { active: 'Activo', invited: 'Invitado', revoked: 'Revocado' },
    accept: {
      eyebrow: 'INVITACIÓN',
      title: 'Te invitaron a una empresa',
      subtitle: 'Al aceptar, tu cuenta obtiene acceso a los datos de esa empresa.',
      action: 'Aceptar invitación',
      accepted: 'Listo',
      missingToken: 'El enlace no trae token. Pide una invitación nueva al owner.',
      genericError: 'No se pudo aceptar la invitación. Intenta de nuevo.',
      signedOutTitle: 'Te invitaron a una empresa en Macha Finance',
      signedOutSubtitle:
        'Entra con tu cuenta para unirte. No vas a crear una empresa: te sumas a la que ya existe, con el rol que te asignaron.',
      signedInAs: 'Estás en la sesión de {email}.',
      useAnotherAccount: 'Entrar con otra cuenta',
      signedOutCreateAccount: 'Crear mi cuenta y unirme',
      signedOutSignIn: 'Ya tengo cuenta',
      emailHint: 'Usa el mismo correo al que te llegó la invitación: es con el que la verificamos.',
      asRole: 'Te unes como {role}',
      join: 'Unirme',
      noPending:
        'No encontramos ninguna invitación pendiente para tu cuenta. Puede que ya la hayas aceptado, que haya vencido, o que se haya enviado a otro correo. Pide una nueva a quien te invitó.',
      unavailable:
        'No pudimos consultar tus invitaciones ahora mismo. Vuelve a intentarlo en un momento.',
      rejection: {
        invalid:
          'No pudimos usar esta invitación. Puede que ya la hayas aceptado, que se haya revocado, o que se haya enviado a un correo distinto del de tu cuenta. Revisa con qué correo entraste, o pide una nueva a quien te invitó.',
        expired: 'La invitación venció. Pide una nueva a quien te invitó.',
        wrongRecipient:
          'Esta invitación no corresponde a tu cuenta. Entra con el correo al que te llegó.',
      },
      pendingTitle: 'Tienes una invitación pendiente',
      pendingSubtitle: '{company} te invitó a su cuenta de Macha Finance.',
      pendingSubtitleMany: 'Te invitaron a más de una empresa. Elige a cuál te unes.',
      pendingCta: 'Ver mi invitación',
    },
  },
  analytics: {
    eyebrow: 'ANALÍTICA',
    title: 'Cómo va tu negocio',
    revenueTrend: 'Tendencia de ingresos',
    cashFlow: 'Entradas y salidas',
    costByCategory: 'Costo por categoría',
    revenueByProduct: 'Ingreso por producto',
    inflow: 'Entradas',
    outflow: 'Salidas',
    outflowCogs: 'Costo de lo vendido',
    outflowOpex: 'Gastos operativos',
    net: 'Neto',
    periodTotal: 'TOTAL DEL PERÍODO',
    shareOfRevenue: 'Participación en el ingreso',
    colCategory: 'Categoría',
    colType: 'Tipo',
    colTotal: 'Total',
    colShare: 'Participación',
    colMovements: 'Movimientos',
    empty: 'Todavía no hay movimientos en este período.',
    emptyHint: 'Prueba con un rango más amplio, o sube tu Excel para empezar.',
    type: {
      revenue: 'Ingreso',
      cogs: 'Costo directo',
      opex: 'Gasto operativo',
      other: 'Otro',
    },
    tabs: {
      overview: 'Resumen',
      revenue: 'Ingresos',
      cashFlow: 'Flujo de caja',
      costs: 'Costos',
      receivables: 'Por cobrar',
      payables: 'Por pagar',
    },
    header: {
      grossMargin: 'Margen bruto',
      netMargin: 'Neto',
      result: 'Resultado',
      resultHint: 'Ingresos menos costos y gastos del período.',
      growth: 'Crecimiento',
      growthHint: 'Ingresos contra el período anterior.',
      arOpen: 'Por cobrar',
      arOpenHint: 'Facturas abiertas, sin importar el período.',
    },
    arAp: {
      agingTitle: 'Antigüedad',
      concentrationTitle: 'Concentración por contraparte',
      rest: 'Otras {n} contrapartes',
      colCounterparty: 'Contraparte',
      colOverdue: 'Vencido',
      colInvoices: 'Documentos',
      colOldest: 'Más antiguo',
      colAmount: 'Monto',
      openTitle: 'Cuentas abiertas',
      openHint: 'Marca una cuenta como saldada y deja de sumar en el balance abierto.',
      openEmpty: 'No hay cuentas abiertas.',
      colDue: 'Vence',
      colStatus: 'Estado',
      markPaid: 'Marcar como pagada',
      markOpen: 'Volver a abierta',
      statusPaid: 'Pagada',
      statusOpen: 'Abierta',
      noDueDate: 'Sin fecha',
      totalOpen: 'TOTAL ABIERTO',
      overdueTotal: 'Vencido',
      emptyAr: 'No tienes facturas por cobrar abiertas.',
      emptyAp: 'No tienes cuentas por pagar abiertas.',
    },
  },
  productSales: {
    eyebrow: 'PRODUCTOS',
    title: 'Ventas por producto',
    topProduct: 'Producto top',
    unitsSold: 'Unidades vendidas',
    avgTicket: 'Ticket promedio',
    bestCategory: 'Mejor categoría',
    slowMover: 'Baja rotación',
    allProducts: 'Todos los productos',
    revenuePerUnit: 'Ingreso por unidad',
    performance: 'Desempeño por producto',
    salesByCategory: 'Ventas por categoría',
    salesByStore: 'Ventas por tienda',
    /*
      Los dos vacíos dicen cosas distintas a propósito: uno es "tu archivo no trae el dato" y
      el otro "no hubo ventas". Con el mismo texto, el dueño que sí tiene sucursales creería
      que el producto no las soporta.
    */
    storesEmptyNoColumn: 'Tus ventas no traen tienda o sucursal.',
    storesEmptyNoColumnHint:
      'Agrega una columna de tienda a tu Excel y la próxima carga las compara entre sí.',
    storesEmptyNoSales: 'No hubo ventas en este período.',
    /* `{amount}` es plata de verdad: se muestra para que el 100 % del donut no se lea como
       el 100 % de las ventas. */
    storesUnattributed: '{amount} en ventas sin tienda asignada, fuera de este reparto.',
    exportCsv: 'Exportar CSV',
    csvFileName: 'ventas-por-producto',
    colProduct: 'Producto',
    colCategory: 'Categoría',
    colUnits: 'Unidades',
    colRevenue: 'Ingreso',
    colCogs: 'Costo',
    colMargin: 'Margen',
    colShare: 'Participación',
    colTrend: 'Tendencia',
    uncategorized: 'Sin clasificar',
    noUnits: 'Sin dato',
    noUnitsHint:
      'Tu archivo no trae una columna de cantidades, así que no se pueden calcular unidades ni ticket promedio.',
    empty: 'Todavía no hay ventas atribuidas a un producto.',
    emptyHint:
      'Ocurre cuando el Excel no identifica productos por fila. Los montos sí están en tu panorama.',
    trend: { up: 'Sube', down: 'Baja', flat: 'Estable' },
  },
  inventory: {
    derivedCost: {
      badge: 'deducido',
      hint: 'Tu archivo de existencias no trae costo. Este es el costo promedio de lo que ya vendiste de ese producto.',
    },
    eyebrow: 'INVENTARIO',
    title: 'Existencias y reposición',
    subtitle: 'Qué tienes en bodega, cuánto vale y qué hay que reponer.',
    stockValue: 'Valor del inventario',
    skuCount: 'Artículos',
    belowReorder: 'Por reponer',
    itemsTitle: 'Artículos',
    movementsTitle: 'Últimos movimientos',
    addItem: 'Agregar artículo',
    editItem: 'Editar artículo',
    recordMovement: 'Registrar movimiento',
    colSku: 'SKU',
    colName: 'Nombre',
    colLocation: 'Ubicación',
    colOnHand: 'Existencia',
    colReorder: 'Punto de reorden',
    colUnitCost: 'Costo unitario',
    colValue: 'Valor',
    colSupplier: 'Proveedor',
    colLastRestock: 'Última entrada',
    colActions: 'Acciones',
    colWhen: 'Cuándo',
    colItem: 'Artículo',
    colMovement: 'Movimiento',
    colQuantity: 'Cantidad',
    colAfter: 'Existencia después',
    colReason: 'Motivo',
    fieldSku: 'SKU',
    fieldName: 'Nombre',
    fieldLocation: 'Ubicación',
    fieldInitialStock: 'Existencia inicial',
    fieldReorderPoint: 'Punto de reorden',
    fieldUnitCost: 'Costo unitario',
    fieldCurrency: 'Moneda',
    fieldSupplier: 'Proveedor',
    fieldMovementType: 'Tipo de movimiento',
    fieldQuantity: 'Cantidad',
    fieldReason: 'Motivo',
    stockIsLedger:
      'La existencia se cambia registrando un movimiento, no editándola: así el historial siempre explica por qué cambió.',
    save: 'Guardar',
    discontinue: 'Dar de baja',
    discontinueConfirm:
      '¿Dar de baja este artículo? Deja de aparecer en la lista, pero su historial de movimientos se conserva.',
    empty: 'Todavía no tienes artículos en inventario.',
    // CU-868krkfrh escribió acá "no se importa del Excel", y en su momento era cierto: Macha
    // subía archivo tras archivo esperando que el inventario se llenara solo. Dejó de serlo el
    // 2026-08-16, cuando la hoja de existencias empezó a poblarlo, y más todavía el 2026-08-24
    // con el inventario serializado (vehículos por VIN, joyas por certificado).
    //
    // Se corrige por el reporte de Jose ("no jala nada de información y el excel sí lo tiene"):
    // su captura muestra la pantalla en cero DICIÉNDOLE que el Excel no cuenta. O sea que el
    // producto le explicaba con seguridad justo lo contrario de lo que hace, y eso es peor que
    // un vacío mudo: lo manda a cargar a mano 260 vehículos que su archivo ya traía.
    //
    // El vacío tiene que seguir cerrando la pregunta "¿y esto cómo se llena?" —esa parte del
    // ticket original sigue vigente— pero con las DOS vías que existen hoy.
    emptyHint:
      'Si tu archivo trae una hoja de existencias, el inventario se llena solo al cargarlo. También puedes agregar artículos a mano aquí.',
    movementsEmpty: 'Aún no hay movimientos registrados.',
    genericError: 'No se pudo completar la acción. Intenta de nuevo.',
    movement: { in: 'Entrada', out: 'Salida', adjustment: 'Ajuste' },
  },
};
