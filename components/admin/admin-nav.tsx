const LINKS = [
  { href: '/admin', label: 'Empresas' },
  { href: '/admin/staging-rows', label: 'Filas marcadas' },
  { href: '/admin/industry-templates', label: 'Plantillas' },
  { href: '/admin/credit-rules', label: 'Créditos' },
  { href: '/admin/config', label: 'Configuración' },
  { href: '/admin/ai-cost', label: 'Costo IA' },
  { href: '/admin/documents', label: 'Uploads' },
] as const;

// design guide.md: orgbar admin usa la superficie inversa para señalar backoffice —
// esta barra de navegación simple hereda ese mismo criterio (.inverse). El shell de
// sidebar real es alcance de la épica de Design System, todavía no construida.
export function AdminNav() {
  return (
    <nav className="inverse mb-4 flex flex-wrap gap-3 rounded-md border border-border bg-card p-3">
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="font-mono text-eyebrow uppercase text-foreground"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
