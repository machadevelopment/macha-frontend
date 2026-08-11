'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertList } from '@/components/alerts/alert-list';
import { AlertRulesPanel } from '@/components/alerts/alert-rules-panel';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Las dos vistas de `/alerts` (ronda de QA 2026-08-11): "Histórico" y "Configuración".
 *
 * Pestañas y no dos rutas: son la misma entrada de navegación y el operador salta entre
 * ellas constantemente —"me llegó esta alerta, súbeme el umbral"—, así que una URL nueva
 * solo agregaría un viaje al servidor entre dos preguntas sobre lo mismo.
 *
 * El histórico arranca seleccionado: es lo que la pantalla ya hacía y lo que la mayoría
 * viene a ver. La configuración se toca una vez cada varios meses.
 *
 * `TabsContent` desmonta lo que no está visible, así que las reglas se piden recién al
 * abrir la pestaña: quien nunca entre a configurar no paga ese request.
 */
export function AlertsScreen({
  locale,
  labels,
  common,
  canEdit,
}: {
  locale: Locale;
  labels: Dictionary['alerts'];
  common: Dictionary['common'];
  canEdit: boolean;
}) {
  return (
    <Tabs defaultValue="history">
      <TabsList className="mb-4">
        <TabsTrigger value="history">{labels.config.tabHistory}</TabsTrigger>
        <TabsTrigger value="config">{labels.config.tabConfig}</TabsTrigger>
      </TabsList>

      <TabsContent value="history">
        <AlertList locale={locale} labels={labels} common={common} />
      </TabsContent>

      <TabsContent value="config">
        <AlertRulesPanel
          labels={labels.config}
          ruleLabels={labels.rule}
          unitLabels={labels.unit}
          common={common}
          canEdit={canEdit}
        />
      </TabsContent>
    </Tabs>
  );
}
