import { getDocuments, getProjectOptions } from "@/lib/queries";
import { DocumentsView } from "@/components/documents/documents-view";

export default async function DocumentsPage() {
  const [documents, projects] = await Promise.all([
    getDocuments(),
    getProjectOptions(),
  ]);
  return <DocumentsView documents={documents} projects={projects} />;
}
