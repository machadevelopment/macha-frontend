// Customer app entry (placeholder). Real dashboard lands in F2+.
// Density: dashboards/tables use data-density="compact".
export default function Home() {
  return (
    <main data-density="compact" className="mx-auto max-w-app p-[26px]">
      <p className="font-mono text-eyebrow uppercase text-faint">MACHA FINANCE</p>
      <h1 className="text-h1">Fundaciones F1</h1>
      <p className="text-body text-muted-foreground">
        Scaffolding listo: tokens de diseño, tipografía Inter/JetBrains Mono y temas claro/oscuro.
      </p>
    </main>
  );
}
