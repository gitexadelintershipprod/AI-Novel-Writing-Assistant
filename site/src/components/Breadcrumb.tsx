import { ChevronRight } from "lucide-react";
import { docsPath } from "../routing";

type BreadcrumbProps = {
  categoryTitle: string;
  docTitle: string;
};

export function Breadcrumb({ categoryTitle, docTitle }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Document location">
      <a href={docsPath()}>Docs</a>
      <ChevronRight size={14} />
      <span>{categoryTitle}</span>
      <ChevronRight size={14} />
      <strong>{docTitle}</strong>
    </nav>
  );
}
