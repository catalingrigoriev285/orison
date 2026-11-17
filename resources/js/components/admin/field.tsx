import type {
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from 'react';
import { ChevronsUpDown } from 'lucide-react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
    label,
    htmlFor,
    error,
    hint,
    children,
    className,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <Label htmlFor={htmlFor} className="text-[13px] font-medium">
                {label}
            </Label>
            {children}
            {hint && !error && (
                <p className="text-[12px] text-muted-foreground">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}

export function NativeSelect({
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className={cn('relative w-full self-start', className)}>
            <select
                {...props}
                className="h-10 w-full appearance-none rounded-[10px] border border-input bg-card px-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                {children}
            </select>
            <ChevronsUpDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
        </div>
    );
}

export function Textarea({
    className,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={cn(
                'min-h-24 w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                className,
            )}
        />
    );
}

/**
 * iOS-style toggle switch with a label and optional description.
 */
export function Toggle({
    id,
    label,
    description,
    checked,
    onChange,
}: {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <label htmlFor={id} className="cursor-pointer">
                <span className="block text-[14px] font-medium">{label}</span>
                {description && (
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        {description}
                    </span>
                )}
            </label>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    checked ? 'bg-status-operational' : 'bg-input',
                )}
            >
                <span
                    className={cn(
                        'inline-block size-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200',
                        checked ? 'translate-x-[20px]' : 'translate-x-[2px]',
                    )}
                />
            </button>
        </div>
    );
}
