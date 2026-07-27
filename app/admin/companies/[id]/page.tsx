import { CompanyDetailPanel } from '@/components/admin/company-detail-panel';

export default function AdminCompanyDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">EMPRESA</p>
      <h1 className="mb-4 text-h1">Detalle</h1>
      <CompanyDetailPanel companyId={params.id} />
    </>
  );
}
