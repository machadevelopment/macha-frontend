import type { Locale } from '@/lib/i18n/config';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LOS NOMBRES VISIBLES DE LAS INDUSTRIAS (lista de Jose, 2026-08-25)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Era uno de los insumos pendientes del Brief §13 y tenía bloqueado el onboarding por rubro:
 * el campo era TEXTO LIBRE, así que `companies.industry` en producción tiene valores escritos a
 * mano que ninguna plantilla puede resolver, y todo cliente nuevo recibía la genérica.
 *
 * ═══ QUIÉN ES DUEÑO DE QUÉ ═══
 *
 * El backend es dueño de los SLUGS: son la llave con la que resuelve qué plantilla de Excel
 * servir (`config/industries.ts` allá). Este archivo solo traduce esa llave a algo legible, que
 * es copia de interfaz y por eso vive de este lado, en los dos idiomas — la pantalla de registro
 * la ve un cliente y el panel admin es bilingüe por decisión de producto.
 *
 * La lista de opciones se PIDE al backend, no se deriva de acá. Si algún día divergen, la
 * degradación es visible en vez de silenciosa: `nombreDeIndustria` devuelve el slug tal cual, así
 * que aparece "nonbank_financial" en el desplegable — feo, y evidente. Lo contrario —derivar las
 * opciones de este archivo— dejaría una industria nueva del backend sin forma de elegirse, sin
 * que nada avisara.
 *
 * ⚠️ `retail` se conserva tal cual y no se renombra a `comercio_minorista`: ya hay empresas
 * guardadas con ese valor, y cambiarlo las dejaría sin su plantilla en silencio.
 */
const NOMBRES: Record<string, { es: string; en: string }> = {
  retail: { es: 'Comercio minorista', en: 'Retail' },
  wholesale: { es: 'Comercio al por mayor y distribución', en: 'Wholesale and distribution' },
  restaurants: { es: 'Restaurantes, alimentos y bebidas', en: 'Restaurants, food and beverage' },
  professional_services: {
    es: 'Servicios profesionales (legal, contable, consultoría)',
    en: 'Professional services (legal, accounting, consulting)',
  },
  healthcare: {
    es: 'Salud (clínicas, laboratorios, farmacias)',
    en: 'Healthcare (clinics, labs, pharmacies)',
  },
  logistics: { es: 'Logística y transporte de carga', en: 'Logistics and freight' },
  construction: { es: 'Construcción e ingeniería', en: 'Construction and engineering' },
  manufacturing: {
    es: 'Manufactura y producción industrial',
    en: 'Manufacturing and industrial production',
  },
  technology: { es: 'Tecnología y servicios de TI', en: 'Technology and IT services' },
  education: {
    es: 'Educación (colegios, academias, institutos)',
    en: 'Education (schools, academies, institutes)',
  },
  beauty_wellness: {
    es: 'Belleza y bienestar (salones, spas, gimnasios)',
    en: 'Beauty and wellness (salons, spas, gyms)',
  },
  agriculture: { es: 'Agroindustria y agropecuario', en: 'Agribusiness and farming' },
  hospitality: {
    es: 'Hospedaje y turismo (hoteles, tour operadores)',
    en: 'Hospitality and tourism (hotels, tour operators)',
  },
  automotive: {
    es: 'Automotriz (talleres, repuestos, concesionarios)',
    en: 'Automotive (workshops, parts, dealerships)',
  },
  real_estate: { es: 'Bienes raíces', en: 'Real estate' },
  events: { es: 'Organización de eventos', en: 'Event management' },
  nonbank_financial: {
    es: 'Servicios financieros no bancarios (cooperativas, microfinancieras)',
    en: 'Non-bank financial services (co-ops, microfinance)',
  },
  nonprofit: { es: 'Organizaciones sin fines de lucro', en: 'Nonprofit organizations' },
  media: { es: 'Entretenimiento y medios', en: 'Entertainment and media' },
  apparel: { es: 'Textil, moda y confección', en: 'Textiles, fashion and apparel' },
  bakery: { es: 'Panadería y repostería', en: 'Bakery and pastry' },
  veterinary: { es: 'Veterinaria y mascotas', en: 'Veterinary and pets' },
  security: { es: 'Seguridad privada', en: 'Private security' },
  cleaning: { es: 'Limpieza y mantenimiento', en: 'Cleaning and maintenance' },
  energy: { es: 'Energía (paneles solares y similares)', en: 'Energy (solar and similar)' },
  import_export: { es: 'Importación y exportación', en: 'Import and export' },
  marketing: { es: 'Publicidad y marketing', en: 'Advertising and marketing' },
  telecom: { es: 'Telecomunicaciones', en: 'Telecommunications' },
};

/**
 * El nombre legible de un slug, o el slug tal cual si no lo conocemos.
 *
 * Devolver el slug y no una cadena vacía es deliberado: una opción sin texto es una opción que
 * no se puede elegir, y el cliente se quedaría sin poder registrar su rubro. Feo y funcional le
 * gana a limpio y roto.
 */
export function nombreDeIndustria(slug: string, locale: Locale): string {
  return NOMBRES[slug]?.[locale] ?? slug;
}

/** Los slugs que este repo sabe nombrar. Solo para tests: las opciones vienen del backend. */
export const SLUGS_CONOCIDOS = Object.keys(NOMBRES);
