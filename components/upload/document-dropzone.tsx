'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { errorMessage, request } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';

const ACCEPT = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
};

interface DocumentDropzoneProps {
  labels: Pick<Dictionary['upload'], 'dropzoneCta' | 'dropzoneHint'>;
  /** CU-868kkgb3c: textos de fallo, para no volver a quemar un string en español. */
  common: Dictionary['common'];
  onUploaded: () => void;
}

// design guide.md §5 "Dropzone" (`.drop`) — hover/drag-over, error (type/size, criterio
// 3 del ticket: mensajería clara). react-dropzone handles the local file-type gate;
// the exact size/row/sheet caps are the backend's (POST /documents), surfaced here
// via the {error} body from app/api/documents/route.ts.
export function DocumentDropzone({ labels, common, onUploaded }: DocumentDropzoneProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        // CU-868kkgb3c: `request` no lanza y clasifica el fallo. Se conserva el cuerpo
        // del backend porque los rechazos de tope (413/402/429/415) traen un `{error}`
        // localizado que hay que mostrar tal cual (criterio 3 de CU-868kfva7z).
        const result = await request<unknown>('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (!result.ok) {
          // El mensaje del backend gana; si no vino, se cae a un texto del diccionario.
          // Antes acá había un string quemado en español, en el camino de fallo de red
          // — el que nadie prueba, que es justo por lo que sobrevivió a CU-868kh8rz8.
          toast.error(
            errorMessage(result.error) ??
              (result.error.kind === 'network'
                ? common.loadError.network
                : common.loadError.server),
          );
          return;
        }
        onUploaded();
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, common],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    disabled: uploading,
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed p-8 text-center transition-colors',
        isDragActive ? 'border-ring bg-accent' : 'border-border',
        uploading && 'pointer-events-none opacity-50',
        fileRejections.length > 0 && 'border-danger',
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="h-6 w-6 text-faint" strokeWidth={1.7} />
      <p className="text-body">{labels.dropzoneCta}</p>
      <p className="font-mono text-eyebrow uppercase text-faint">{labels.dropzoneHint}</p>
      {fileRejections.length > 0 && (
        <p className="text-body text-danger">{fileRejections[0]?.errors[0]?.message}</p>
      )}
    </div>
  );
}
