import { Head, useForm } from '@inertiajs/react';
import { ImageUp, RotateCcw, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Field,
    NativeSelect,
    Textarea,
    Toggle,
} from '@/components/admin/field';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';
import settingsRoutes from '@/routes/admin/settings';
import type { Locale } from '@/types';

type Props = {
    settings: {
        name: string;
        description: string | null;
        website_url: string | null;
        accent_color: string;
        default_locale: Locale;
        timezone: string;
        logo_url: string | null;
        favicon_url: string | null;
        background_url: string | null;
        has_custom_background: boolean;
        default_background_url: string | null;
        show_background: boolean;
    };
    timezones: string[];
};

type SettingsForm = {
    _method: 'put';
    name: string;
    description: string;
    website_url: string;
    accent_color: string;
    default_locale: Locale;
    timezone: string;
    logo: File | null;
    favicon: File | null;
    background: File | null;
    show_background: boolean;
    remove_logo: boolean;
    remove_favicon: boolean;
    remove_background: boolean;
};

/** Apple system colours offered as one-click accents. */
const swatches = [
    '#0071e3',
    '#34c759',
    '#5856d6',
    '#af52de',
    '#ff2d55',
    '#ff9500',
    '#30b0c7',
    '#1d1d1f',
];

const languageNames: Record<Locale, string> = {
    ro: 'Română',
    ru: 'Русский',
    en: 'English',
};

export default function Settings({ settings, timezones }: Props) {
    const { t, locales } = useTrans();

    const backgroundInput = useRef<HTMLInputElement>(null);

    useBreadcrumbs([{ title: t('Settings'), href: settingsRoutes.edit() }]);

    const form = useForm<SettingsForm>({
        _method: 'put',
        name: settings.name,
        description: settings.description ?? '',
        website_url: settings.website_url ?? '',
        accent_color: settings.accent_color,
        default_locale: settings.default_locale,
        timezone: settings.timezone,
        logo: null,
        favicon: null,
        background: null,
        show_background: settings.show_background,
        remove_logo: false,
        remove_favicon: false,
        remove_background: false,
    });
    const { data, setData, errors, processing } = form;

    const logoPreview = usePreview(
        data.logo,
        data.remove_logo ? null : settings.logo_url,
    );
    const faviconPreview = usePreview(
        data.favicon,
        data.remove_favicon ? null : settings.favicon_url,
    );
    const backgroundPreview = usePreview(
        data.background,
        data.remove_background
            ? settings.default_background_url
            : settings.background_url,
    );
    const hasCustomBackground =
        data.background !== null ||
        (settings.has_custom_background && !data.remove_background);
    const validColor = /^#[0-9a-fA-F]{6}$/.test(data.accent_color)
        ? data.accent_color
        : settings.accent_color;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(settingsRoutes.update.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () =>
                form.setData((current) => ({
                    ...current,
                    logo: null,
                    favicon: null,
                    remove_logo: false,
                    remove_favicon: false,
                    background: null,
                    remove_background: false,
                })),
        });
    };

    return (
        <AdminPage>
            <Head title={t('Settings')} />
            <PageHeader
                title={t('Settings')}
                description={t(
                    'Name, look and regional settings of your status page.',
                )}
            />

            <form
                onSubmit={submit}
                className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
            >
                <div className="space-y-8">
                    <section>
                        <SectionTitle>{t('Status page')}</SectionTitle>
                        <Surface className="space-y-5 p-6">
                            <Field
                                label={t('Name')}
                                htmlFor="name"
                                error={errors.name}
                                hint={t(
                                    'Shown in the header and the browser tab.',
                                )}
                            >
                                <Input
                                    id="name"
                                    value={data.name}
                                    maxLength={60}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                label={t('Description')}
                                htmlFor="description"
                                error={errors.description}
                                hint={t(
                                    'Used by search engines and link previews.',
                                )}
                            >
                                <Textarea
                                    id="description"
                                    rows={2}
                                    maxLength={200}
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label={t('Website')}
                                htmlFor="website_url"
                                error={errors.website_url}
                                hint={t(
                                    'Linked from the footer of the status page.',
                                )}
                            >
                                <Input
                                    id="website_url"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={data.website_url}
                                    onChange={(e) =>
                                        setData('website_url', e.target.value)
                                    }
                                />
                            </Field>
                        </Surface>
                    </section>

                    <section>
                        <SectionTitle>{t('Branding')}</SectionTitle>
                        <Surface className="divide-y divide-hairline">
                            <ImagePicker
                                id="logo"
                                label={t('Logo')}
                                hint={t(
                                    'Square image, at least 128×128. PNG, JPG, WebP or SVG, up to 1 MB.',
                                )}
                                accept=".png,.jpg,.jpeg,.webp,.svg"
                                preview={logoPreview}
                                fallback={
                                    <span
                                        className="flex size-full items-center justify-center rounded-[14px] text-white"
                                        style={{ backgroundColor: validColor }}
                                    >
                                        <AppLogoIcon className="size-[70%]" />
                                    </span>
                                }
                                error={errors.logo}
                                onPick={(file) =>
                                    form.setData((current) => ({
                                        ...current,
                                        logo: file,
                                        remove_logo: false,
                                    }))
                                }
                                onRemove={() =>
                                    form.setData((current) => ({
                                        ...current,
                                        logo: null,
                                        remove_logo: true,
                                    }))
                                }
                                canRemove={!!logoPreview}
                            />
                            <ImagePicker
                                id="favicon"
                                label={t('Favicon')}
                                hint={t(
                                    'The icon in the browser tab. PNG, ICO or SVG, up to 512 KB.',
                                )}
                                accept=".png,.ico,.svg"
                                preview={faviconPreview}
                                fallback={
                                    <img
                                        src="/favicon.svg"
                                        alt=""
                                        className="size-full"
                                    />
                                }
                                error={errors.favicon}
                                onPick={(file) =>
                                    form.setData((current) => ({
                                        ...current,
                                        favicon: file,
                                        remove_favicon: false,
                                    }))
                                }
                                onRemove={() =>
                                    form.setData((current) => ({
                                        ...current,
                                        favicon: null,
                                        remove_favicon: true,
                                    }))
                                }
                                canRemove={!!faviconPreview}
                                small
                            />
                            <div className="space-y-3 p-6">
                                <p className="text-[13px] font-medium">
                                    {t('Accent colour')}
                                </p>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {swatches.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            aria-label={color}
                                            aria-pressed={
                                                data.accent_color.toLowerCase() ===
                                                color
                                            }
                                            onClick={() =>
                                                setData('accent_color', color)
                                            }
                                            className={cn(
                                                'size-8 rounded-full ring-offset-2 ring-offset-card transition-shadow duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                data.accent_color.toLowerCase() ===
                                                    color &&
                                                    'ring-2 ring-foreground',
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <label className="relative ml-1 flex items-center gap-2 rounded-full border border-input bg-card py-1 pr-3 pl-1">
                                        <input
                                            type="color"
                                            aria-label={t('Custom colour')}
                                            value={validColor}
                                            onChange={(e) =>
                                                setData(
                                                    'accent_color',
                                                    e.target.value,
                                                )
                                            }
                                            className="size-6 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                                        />
                                        <input
                                            aria-label={t('Hex colour')}
                                            value={data.accent_color}
                                            maxLength={7}
                                            onChange={(e) =>
                                                setData(
                                                    'accent_color',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-[4.5rem] bg-transparent font-mono text-[13px] uppercase outline-none"
                                        />
                                    </label>
                                </div>
                                {errors.accent_color && (
                                    <p className="text-sm text-destructive-foreground">
                                        {errors.accent_color}
                                    </p>
                                )}
                            </div>
                        </Surface>
                    </section>

                    <section>
                        <SectionTitle>{t('Background')}</SectionTitle>
                        <Surface className="divide-y divide-hairline">
                            <div className="p-5">
                                <Toggle
                                    id="show_background"
                                    label={t('Show background image')}
                                    description={t(
                                        'A wide image at the top of the status page.',
                                    )}
                                    checked={data.show_background}
                                    onChange={(value) =>
                                        setData('show_background', value)
                                    }
                                />
                            </div>
                            <div
                                className={cn(
                                    'space-y-4 p-6 transition-opacity duration-200',
                                    !data.show_background && 'opacity-50',
                                )}
                            >
                                <div className="aspect-[3/1] overflow-hidden rounded-[14px] border border-hairline bg-fill">
                                    {backgroundPreview ? (
                                        <img
                                            src={backgroundPreview}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
                                            {t('No image')}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-[12px] text-muted-foreground">
                                        {hasCustomBackground
                                            ? t('Custom image.')
                                            : t(
                                                  'Using the default image.',
                                              )}{' '}
                                        {t(
                                            'Wide image, about 2400×800. PNG, JPG or WebP, up to 4 MB.',
                                        )}
                                    </p>
                                    <div className="flex shrink-0 gap-1.5">
                                        <input
                                            ref={backgroundInput}
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.webp"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file =
                                                    event.target.files?.[0];

                                                if (file) {
                                                    form.setData((current) => ({
                                                        ...current,
                                                        background: file,
                                                        remove_background: false,
                                                        show_background: true,
                                                    }));
                                                }

                                                event.target.value = '';
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                                backgroundInput.current?.click()
                                            }
                                        >
                                            <ImageUp /> {t('Upload')}
                                        </Button>
                                        {hasCustomBackground && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    form.setData((current) => ({
                                                        ...current,
                                                        background: null,
                                                        remove_background: true,
                                                    }))
                                                }
                                            >
                                                <RotateCcw />{' '}
                                                {t('Restore default')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {errors.background && (
                                    <p className="text-sm text-destructive-foreground">
                                        {errors.background}
                                    </p>
                                )}
                            </div>
                        </Surface>
                    </section>

                    <section>
                        <SectionTitle>{t('Language & time')}</SectionTitle>
                        <Surface className="grid gap-5 p-6 sm:grid-cols-2">
                            <Field
                                label={t('Default language')}
                                htmlFor="default_locale"
                                error={errors.default_locale}
                                hint={t(
                                    'Used for new visitors and required when writing incidents.',
                                )}
                            >
                                <NativeSelect
                                    id="default_locale"
                                    value={data.default_locale}
                                    onChange={(e) =>
                                        setData(
                                            'default_locale',
                                            e.target.value as Locale,
                                        )
                                    }
                                >
                                    {locales.map((code) => (
                                        <option key={code} value={code}>
                                            {languageNames[code]}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <Field
                                label={t('Timezone')}
                                htmlFor="timezone"
                                error={errors.timezone}
                                hint={t(
                                    'Dates and the daily uptime bars use this timezone.',
                                )}
                            >
                                <NativeSelect
                                    id="timezone"
                                    value={data.timezone}
                                    onChange={(e) =>
                                        setData('timezone', e.target.value)
                                    }
                                >
                                    {timezones.map((zone) => (
                                        <option key={zone} value={zone}>
                                            {zone.replaceAll('_', ' ')}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </Field>
                        </Surface>
                    </section>
                </div>

                <aside className="lg:sticky lg:top-6 lg:self-start">
                    <SectionTitle>{t('Preview')}</SectionTitle>
                    <Preview
                        name={data.name}
                        color={validColor}
                        logo={logoPreview}
                        favicon={faviconPreview}
                        background={
                            data.show_background ? backgroundPreview : null
                        }
                    />
                    <Button
                        type="submit"
                        className="mt-6 w-full"
                        size="lg"
                        disabled={processing || !form.isDirty}
                    >
                        {processing && <Spinner />}
                        {t('Save settings')}
                    </Button>
                </aside>
            </form>
        </AdminPage>
    );
}

/**
 * A local object URL for a freshly picked file, or the saved image URL.
 */
function usePreview(file: File | null, savedUrl: string | null): string | null {
    const objectUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );

    useEffect(
        () => () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        },
        [objectUrl],
    );

    return objectUrl ?? savedUrl;
}

function ImagePicker({
    id,
    label,
    hint,
    accept,
    preview,
    fallback,
    error,
    onPick,
    onRemove,
    canRemove,
    small = false,
}: {
    id: string;
    label: string;
    hint: string;
    accept: string;
    preview: string | null;
    fallback: React.ReactNode;
    error?: string;
    onPick: (file: File) => void;
    onRemove: () => void;
    canRemove: boolean;
    small?: boolean;
}) {
    const { t } = useTrans();
    const input = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-5 p-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-[16px] border border-hairline bg-fill">
                <div className={small ? 'size-8' : 'size-14'}>
                    {preview ? (
                        <img
                            src={preview}
                            alt=""
                            className="size-full rounded-[12px] object-contain"
                        />
                    ) : (
                        fallback
                    )}
                </div>
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{label}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {hint}
                </p>
                {error && (
                    <p className="mt-1 text-sm text-destructive-foreground">
                        {error}
                    </p>
                )}
                {!preview && (
                    <p className="mt-1 text-[12px] text-muted-foreground">
                        {t('Using the default.')}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 gap-1.5">
                <input
                    ref={input}
                    id={id}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                            onPick(file);
                        }

                        event.target.value = '';
                    }}
                />
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => input.current?.click()}
                >
                    <ImageUp /> {t('Upload')}
                </Button>
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        aria-label={t('Remove')}
                    >
                        <Trash2 />
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * How the header and browser tab will look with the unsaved settings.
 */
function Preview({
    name,
    color,
    logo,
    favicon,
    background,
}: {
    name: string;
    color: string;
    logo: string | null;
    favicon: string | null;
    background: string | null;
}) {
    const { t } = useTrans();

    return (
        <Surface className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hairline bg-fill px-3 pt-2.5">
                <div className="flex max-w-full items-center gap-2 rounded-t-[10px] bg-card px-3 py-2 text-[12px]">
                    <img
                        src={favicon ?? '/favicon.svg'}
                        alt=""
                        className="size-4 shrink-0 object-contain"
                    />
                    <span className="truncate">{name || 'Orison'}</span>
                </div>
            </div>
            <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
                {logo ? (
                    <img
                        src={logo}
                        alt=""
                        className="size-7 rounded-[8px] object-contain"
                    />
                ) : (
                    <span
                        className="inline-flex size-7 items-center justify-center rounded-[8px] text-white"
                        style={{ backgroundColor: color }}
                    >
                        <AppLogoIcon className="size-[70%]" />
                    </span>
                )}
                <span className="truncate text-[14px] font-semibold tracking-tight">
                    {name || 'Orison'}{' '}
                    <span className="font-normal text-muted-foreground">
                        {t('Status')}
                    </span>
                </span>
            </div>
            {background && (
                <img
                    src={background}
                    alt=""
                    className="aspect-[3/1] w-full object-cover"
                />
            )}
            <div className="space-y-3 px-4 py-5 text-center">
                <div className="mx-auto size-10 rounded-full bg-status-operational" />
                <p className="text-[15px] font-semibold tracking-tight">
                    {t('All systems operational')}
                </p>
                <div className="flex justify-center gap-2">
                    <span
                        className="rounded-full px-3 py-1 text-[12px] font-medium text-white"
                        style={{ backgroundColor: color }}
                    >
                        {t('Button')}
                    </span>
                    <span
                        className="px-1 py-1 text-[12px] font-medium"
                        style={{ color }}
                    >
                        {t('Link')}
                    </span>
                </div>
            </div>
        </Surface>
    );
}
