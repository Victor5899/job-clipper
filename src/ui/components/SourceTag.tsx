import { SOURCE_LABELS, type SourceId } from "../../core/model/enums";

export function SourceTag({ source }: { source: SourceId }) {
  return <span className="micro-label text-text-subtle">{SOURCE_LABELS[source]}</span>;
}
