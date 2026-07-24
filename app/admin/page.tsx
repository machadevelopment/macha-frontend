// Admin panel lives in the frontend (not a third app); role-gated via backend staff tier.
// Uses the inverse (dark) orgbar surface to signal backoffice context.
export default function AdminHome() {
  return (
    <main data-density="compact" className="mx-auto max-w-app p-[26px]">
      <p className="font-mono text-eyebrow uppercase text-faint">ADMIN</p>
      <h1 className="text-h1">Backoffice</h1>
    </main>
  );
}
