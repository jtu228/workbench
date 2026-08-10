import { Suspense } from "react";
import { getDocuments, getLocalFolderAccount, getProjectOptions } from "@/lib/queries";
import { DocumentsView } from "@/components/documents/documents-view";

export default async function DocumentsPage() {
  const [documents, projects, localFolderAccount] = await Promise.all([
    getDocuments(),
    getProjectOptions(),
    getLocalFolderAccount(),
  ]);
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">加载文档中心…</div>}>
      <DocumentsView
        documents={documents}
        projects={projects}
        localFolderAccount={localFolderAccount}
      />
    </Suspense>
  );
}
