'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentDropzone } from '@/components/upload/document-dropzone';
import { DocumentList } from '@/components/upload/document-list';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

export function UploadScreen({
  locale,
  labels,
  common,
  canRevert,
}: {
  locale: Locale;
  labels: Dictionary['upload'];
  common: Dictionary['common'];
  canRevert: boolean;
}) {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <DocumentDropzone
        labels={labels}
        common={common}
        onUploaded={() => setRefreshToken((n) => n + 1)}
      />
      <a href="/api/industry-templates/download" className="self-start">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.downloadTemplate}
        </Button>
      </a>
      <Card>
        <DocumentList
          locale={locale}
          labels={labels}
          common={common}
          refreshToken={refreshToken}
          canRevert={canRevert}
        />
      </Card>
    </div>
  );
}
