import { Link } from '@inertiajs/react';
import { BrandMark } from '@/components/brand-mark';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="mb-1 flex items-center justify-center">
                                <BrandMark className="size-14 rounded-[16px]" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-[26px] font-semibold tracking-tight">
                                {title}
                            </h1>
                            <p className="text-center text-[15px] text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-[20px] border border-hairline bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
