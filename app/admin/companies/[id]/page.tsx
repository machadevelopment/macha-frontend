import { CompanyDetailPanel } from '@/components/admin/company-detail-panel';

// CU-868khvzqn: el título vive dentro del panel porque ahora es el nombre real de la
// empresa, y ese dato solo se conoce después del fetch. Acá decía "Detalle", que no
// indicaba en cuál de las empresas estabas parado.
export default function AdminCompanyDetailPage({ params }: { params: { id: string } }) {
  return <CompanyDetailPanel companyId={params.id} />;
}
