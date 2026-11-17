import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useTrans } from '@/hooks/use-trans';

/**
 * A destructive action guarded by a confirmation dialog.
 */
export function ConfirmButton({
    href,
    method = 'delete',
    title,
    description,
    confirmLabel,
    children,
    variant = 'ghost',
}: {
    href: string;
    method?: 'delete' | 'post';
    title: string;
    description?: string;
    confirmLabel?: string;
    children: ReactNode;
    variant?: 'ghost' | 'outline' | 'destructive' | 'secondary';
}) {
    const { t } = useTrans();
    const [processing, setProcessing] = useState(false);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant={variant}
                    size="sm"
                    className={
                        variant === 'ghost'
                            ? 'text-destructive-foreground hover:text-destructive-foreground'
                            : undefined
                    }
                >
                    {children}
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[20px] sm:max-w-md">
                <DialogTitle>{title}</DialogTitle>
                {description && (
                    <DialogDescription>{description}</DialogDescription>
                )}
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('Cancel')}</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        disabled={processing}
                        onClick={() =>
                            router.visit(href, {
                                method,
                                onStart: () => setProcessing(true),
                                onFinish: () => setProcessing(false),
                            })
                        }
                    >
                        {confirmLabel ?? t('Delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
