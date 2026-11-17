import { Head, router } from '@inertiajs/react';
import { ChevronDown, RotateCw, Send } from 'lucide-react';
import { useState } from 'react';
import { alertStateLabel, alertStateTone } from '@/components/admin/alert-row';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/status/status-badge';
import { StatusDot } from '@/components/status/status-dot';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
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
    webhook: { url: string | null; has_secret: boolean };
};

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

            <Surface className="mb-10 grid gap-4 p-6 sm:grid-cols-2">
                <div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                        {t('Webhook URL')}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[14px]">
                        <StatusDot
                            tone={webhook.url ? 'operational' : 'major'}
                        />
                        {webhook.url ? (
                            <code className="truncate font-mono text-[13px]">
                                {webhook.url}
                            </code>
                        ) : (
                            <span>
                                {t(
                                    'Not configured — set STATUS_WEBHOOK_URL in .env',
                                )}
                            </span>
                        )}
                    </p>
                </div>
                <div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                        {t('Signing secret')}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[14px]">
                        <StatusDot
                            tone={
                                webhook.has_secret ? 'operational' : 'degraded'
                            }
                        />
                        {webhook.has_secret
                            ? t('Configured')
                            : t(
                                  'Not configured — set STATUS_WEBHOOK_SECRET in .env',
                              )}
                    </p>
                </div>
            </Surface>

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
