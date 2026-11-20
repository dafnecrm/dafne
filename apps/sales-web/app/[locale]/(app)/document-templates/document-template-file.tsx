"use client";

import { DownloadIcon, EyeIcon, FileUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@dafne/frontend-ui/components/alert";
import { Button } from "@dafne/frontend-ui/components/button";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import { useCan } from "@dafne/frontend-permissions";
import type { DocumentTemplateDetail, DocumentTemplateError } from "@/lib/document-templates";

/** What the upload route answers on an error. */
interface UploadError {
  error: string;
  errors?: DocumentTemplateError[];
}

/**
 * The Word file of a template: upload or replace it (the API checks it
 * with sample data and lists the tags at fault), download it, preview it
 * as a PDF. Uploading needs DocumentTemplate.update (admins always).
 */
export function DocumentTemplateFile({ documentTemplate }: { documentTemplate: DocumentTemplateDetail }) {
  const t = useTranslations();
  const canUpload = useCan("update", "DocumentTemplate");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadError | "uploaded" | null>(null);
  const base = `/api/document-templates/${encodeURIComponent(documentTemplate.id)}`;
  const hasFile = Boolean(documentTemplate.fileName);

  async function upload(file: File) {
    setUploading(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const res = await fetch(`${base}/file`, { method: "PUT", body });
      if (res.ok) {
        setResult("uploaded");
        router.refresh();
      } else {
        setResult(((await res.json().catch(() => null)) as UploadError | null) ?? { error: t("common.errors.generic") });
      }
    } catch {
      setResult({ error: t("common.errors.generic") });
    } finally {
      setUploading(false);
      if (input.current) {
        input.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {hasFile ? documentTemplate.fileName : t("documentTemplates.file.none")}
      </p>
      <div className="flex flex-wrap gap-2">
        {canUpload && (
          <>
            <input
              ref={input}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void upload(file);
                }
              }}
            />
            <Button size="sm" disabled={uploading} onClick={() => input.current?.click()}>
              {uploading ? <Spinner data-icon="inline-start" /> : <FileUpIcon data-icon="inline-start" />}
              {uploading
                ? t("documentTemplates.file.uploading")
                : t(hasFile ? "documentTemplates.file.replace" : "documentTemplates.file.upload")}
            </Button>
          </>
        )}
        {hasFile && (
          <>
            <Button size="sm" variant="outline" nativeButton={false} render={<a href={`${base}/preview`} target="_blank" rel="noopener" />}>
              <EyeIcon data-icon="inline-start" />
              {t("documentTemplates.file.preview")}
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<a href={`${base}/file`} download />}>
              <DownloadIcon data-icon="inline-start" />
              {t("documentTemplates.file.download")}
            </Button>
          </>
        )}
      </div>
      {canUpload && <p className="text-muted-foreground text-xs">{t("documentTemplates.file.hint")}</p>}
      {result === "uploaded" && (
        <Alert>
          <AlertDescription>{t("documentTemplates.file.uploaded")}</AlertDescription>
        </Alert>
      )}
      {result && result !== "uploaded" && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{result.error}</p>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {result.errors.map((error, index) => (
                  <li key={index}>
                    {error.tag
                      ? t("documentTemplates.errors.tag", { tag: error.tag, explanation: error.explanation })
                      : error.explanation}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
