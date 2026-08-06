import { getProjectsWithRelations } from "@/lib/queries";
import { ProjectsList } from "@/components/projects/projects-list";

export default async function ProjectsPage() {
  const projects = await getProjectsWithRelations();
  return <ProjectsList projects={projects} />;
}
