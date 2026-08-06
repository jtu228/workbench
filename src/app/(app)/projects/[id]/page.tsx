import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/queries";
import { ProjectDetail } from "@/components/projects/project-detail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  return <ProjectDetail project={project} />;
}
