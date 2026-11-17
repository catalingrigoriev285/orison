import { useState } from 'react';
import { Textarea } from '@/components/admin/field';
import InputError from '@/components/input-error';
import { SegmentedControl } from '@/components/status/segmented-control';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/hooks/use-trans';
import type { Locale, Translations } from '@/types';

const localeNames: Record<Locale, string> = {
    ro: 'Română',
    ru: 'Русский',
    en: 'English',
};

/**
 * One field edited in Romanian, Russian and English. Romanian is required;
 * empty translations fall back to it on the public page.
 */
export function TranslatableField({
    id,
    label,
    value,
    onChange,
    errors,
    name,
    multiline = false,
    required = true,
}: {
    id: string;
    label: string;
    value: Translations;
    onChange: (value: Translations) => void;
    errors: Partial<Record<string, string>>;
    name: string;
    multiline?: boolean;
    required?: boolean;
}) {
    const { t, locales } = useTrans();
    const [active, setActive] = useState<Locale>('ro');
    const error = errors[`${name}.${active}`] ?? errors[name];
    const missing = locales.filter((code) => code !== 'ro' && !value[code]);

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label
                    htmlFor={`${id}-${active}`}
                    className="text-[13px] font-medium"
                >
                    {label}
                    {required && active === 'ro' && (
                        <span className="text-muted-foreground"> *</span>
                    )}
                </Label>
                <SegmentedControl
                    size="sm"
                    value={active}
                    onChange={(code) => setActive(code as Locale)}
                    items={locales.map((code) => ({
                        value: code,
                        label: code.toUpperCase(),
                    }))}
                />
            </div>
            {locales.map((code) => {
                const props = {
                    id: `${id}-${code}`,
                    value: value[code] ?? '',
                    lang: code,
                    placeholder:
                        code === 'ro'
                            ? ''
                            : t('Optional — falls back to Romanian'),
                    onChange: (
                        event: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                        >,
                    ) => onChange({ ...value, [code]: event.target.value }),
                    'aria-label': `${label} (${localeNames[code]})`,
                    hidden: code !== active,
                };

                return multiline ? (
                    <Textarea key={code} rows={4} {...props} />
                ) : (
                    <Input key={code} {...props} />
                );
            })}
            {missing.length > 0 && !error && (
                <p className="text-[12px] text-muted-foreground">
                    {t('Missing translation: :languages', {
                        languages: missing
                            .map((code) => localeNames[code])
                            .join(', '),
                    })}
                </p>
            )}
            <InputError message={error} />
        </div>
    );
}
