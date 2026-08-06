import { getMemos } from "@/lib/queries";
import { MemosView } from "@/components/memos/memos-view";

export default async function MemosPage() {
  const memos = await getMemos();
  return <MemosView memos={memos} />;
}
