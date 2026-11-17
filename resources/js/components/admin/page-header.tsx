import type { ReactNode } from 'react';

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

export function AdminPage({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
            {children}
        </div>
    );
}

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            <p className="text-[17px] font-semibold tracking-tight">{title}</p>
            {description && (
                <p className="mt-1 max-w-sm text-[14px] text-muted-foreground">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
