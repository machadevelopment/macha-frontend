'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import type { Dictionary } from '@/lib/i18n/dictionary';

const ACCEPT = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
};

interface DocumentDropzoneProps {
  labels: Pick<Dictionary['upload'], 'dropzoneCta' | 'dropzoneHint'>;
  onUploaded: () => void;
}

// design guide.md §5 "Dropzone" (`.drop`) — hover/drag-over, error (type/size, criterio
// 3 del ticket: mensajería clara). react-dropzone handles the local file-type gate;
// the exact size/row/sheet caps are the backend's (POST /documents), surfaced here
// via the {error} body from app/api/documents/route.ts.
export function DocumentDropzone({ labels, onUploaded }: DocumentDropzoneProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/documents', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? `Error ${res.status}`);
          return;
        }
        onUploaded();
      } catch {
        toast.error('No se pudo subir el archivo. Intenta de nuevo.');
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
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
