import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronDown,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    RotateCw,
    Send,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Field } from '@/components/admin/field';
import { alertStateLabel, alertStateTone } from '@/components/admin/alert-row';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/status/status-badge';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import alerts from '@/routes/admin/alerts';
import type { AlertSummary, Paginated } from '@/types';

type Delivery = AlertSummary & {
    payload: Record<string, unknown>;
    error: string | null;
    response_code: number | null;
    attempts: number;
    uuid: string;
};

type Props = {
    deliveries: Paginated<Delivery>;
    webhook: { url: string | null; secret: string | null };
};

/** A 64-character random secret, base62, from the browser's CSPRNG. */
function generateSecret(): string {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export default function AlertsIndex({ deliveries, webhook }: Props) {
    const { t } = useTrans();
    const [sending, setSending] = useState(false);

    useBreadcrumbs([{ title: t('Alerts'), href: alerts.index() }]);

    return (
        <AdminPage>
            <Head title={t('Alerts')} />
            <PageHeader
                title={t('Alerts')}
                description={t(
                    'Every alert is POSTed as signed JSON to your webhook endpoint, which decides who to notify.',
                )}
                actions={
                    <Button
                        variant="secondary"
                        disabled={sending}
                        onClick={() =>
                            router.post(
                                alerts.test.url(),
                                {},
                                {
                                    preserveScroll: true,
                                    onStart: () => setSending(true),
                                    onFinish: () => setSending(false),
                                },
                            )
                        }
                    >
                        <Send /> {t('Send test alert')}
                    </Button>
                }
            />

            <WebhookForm webhook={webhook} />

            <SectionTitle>{t('Delivery log')}</SectionTitle>
            <Surface className="divide-y divide-hairline overflow-hidden">
                {deliveries.data.length === 0 ? (
                    <EmptyState
                        title={t('No alerts sent yet.')}
                        description={t(
                            'Alerts appear here when monitors change state or incidents are posted.',
                        )}
                    />
                ) : (
                    deliveries.data.map((delivery) => (
                        <DeliveryRow key={delivery.id} delivery={delivery} />
                    ))
                )}
            </Surface>

            <Pagination page={deliveries} />
        </AdminPage>
    );
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
    const { t, locale, timezone } = useTrans();
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-accent"
            >
                <div className="min-w-0">
                    <p className="font-mono text-[13px] font-medium">
                        {delivery.event}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                        {formatDateTime(delivery.created_at, locale, timezone)}
                        {' · '}
                        {t(':count attempts', { count: delivery.attempts })}
                        {delivery.response_code !== null &&
                            ` · HTTP ${delivery.response_code}`}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge
                        tone={alertStateTone[delivery.state]}
                        label={t(alertStateLabel[delivery.state])}
                    />
                    <ChevronDown
                        className={cn(
                            'size-4 text-muted-foreground transition-transform duration-200',
                            open && 'rotate-180',
                        )}
                    />
                </div>
            </button>
            {open && (
                <div className="space-y-3 border-t border-hairline bg-fill px-5 py-4">
                    {delivery.error && (
                        <p className="text-[13px] text-status-major">
                            <span className="font-semibold">{t('Error')}:</span>{' '}
                            {delivery.error}
                        </p>
                    )}
                    <pre className="max-h-80 overflow-auto rounded-[12px] bg-card p-4 font-mono text-[12px] leading-relaxed">
                        {JSON.stringify(delivery.payload, null, 2)}
                    </pre>
                    <div className="flex items-center justify-between gap-3">
                        <code className="truncate text-[11px] text-muted-foreground">
                            {delivery.uuid}
                        </code>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                                router.post(
                                    alerts.retry.url(delivery.id),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <RotateCw /> {t('Resend')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function WebhookForm({ webhook }: { webhook: Props['webhook'] }) {
    const { t } = useTrans();
    const [visible, setVisible] = useState(false);
    const { data, setData, put, processing, errors, isDirty } = useForm({
        url: webhook.url ?? '',
        secret: webhook.secret ?? '',
    });

    const copy = (value: string) => {
        if (!value) {
            return;
        }

        navigator.clipboard
            .writeText(value)
            .then(() => toast.success(t('Copied to clipboard.')))
            .catch(() => toast.error(t('Could not copy.')));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(alerts.webhook.url(), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} autoComplete="off" className="mb-10">
            <SectionTitle>{t('Webhook')}</SectionTitle>
            <Surface className="space-y-5 p-6">
                <Field
                    label={t('Webhook URL')}
                    htmlFor="webhook_url"
                    error={errors.url}
                    hint={t('Every alert is POSTed here as signed JSON.')}
                >
                    <div className="flex gap-2">
                        <Input
                            id="webhook_url"
                            type="url"
                            autoComplete="off"
                            placeholder="https://example.com/api/status/webhook"
                            value={data.url}
                            onChange={(e) => setData('url', e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!data.url}
                            onClick={() => copy(data.url)}
                            aria-label={t('Copy')}
                        >
                            <Copy />
                        </Button>
                    </div>
                </Field>
                <Field
                    label={t('Signing secret')}
                    htmlFor="webhook_secret"
                    error={errors.secret}
                    hint={t(
                        'Shared with the receiving application, which must use the same value. At least 32 characters.',
                    )}
                >
                    <div className="flex gap-2">
                        <Input
                            id="webhook_secret"
                            type={visible ? 'text' : 'password'}
                            autoComplete="new-password"
                            spellCheck={false}
                            className="font-mono"
                            value={data.secret}
                            onChange={(e) => setData('secret', e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setVisible(!visible)}
                            aria-label={visible ? t('Hide') : t('Show')}
                        >
                            {visible ? <EyeOff /> : <Eye />}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!data.secret}
                            onClick={() => copy(data.secret)}
                            aria-label={t('Copy')}
                        >
                            <Copy />
                        </Button>
                    </div>
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={processing || !isDirty}>
                        {processing && <Spinner />}
                        {t('Save')}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            if (
                                webhook.secret &&
                                !window.confirm(
                                    t(
                                        'Generate a new secret? Alerts will be rejected until the receiving application uses it too.',
                                    ),
                                )
                            ) {
                                return;
                            }

                            setData('secret', generateSecret());
                            setVisible(true);
                        }}
                    >
                        <RefreshCw /> {t('Generate secret')}
                    </Button>
                </div>
            </Surface>
        </form>
    );
}
