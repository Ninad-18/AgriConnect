import type { ReactNode } from "react";

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold text-forest">{children}</h1>;
}

export function PageHeader({
  title,
  actions,
  description,
}: {
  title: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <PageTitle>{title}</PageTitle>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}