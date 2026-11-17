import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { AffectedComponents } from '@/components/admin/affected-components';
import type { AffectedComponent } from '@/components/admin/affected-components';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { Field, NativeSelect } from '@/components/admin/field';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { TranslatableField } from '@/components/admin/translatable-field';
import { StatusBadge } from '@/components/status/status-badge';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime } from '@/lib/format';
import {
    incidentImpactLabel,
    incidentImpacts,
    incidentImpactTone,
    incidentStatusLabel,
    incidentStatuses,
} from '@/lib/status';
import incidents from '@/routes/admin/incidents';
import { incident as publicIncident } from '@/routes/status';
import type {
    IncidentImpact,
    IncidentStatus,
    Option,
    Translations,
} from '@/types';

type Update = {
    id: number;
    status: IncidentStatus;
    message: Translations;
    author: string | null;
    created_at: string;
};

type Props = {
    incident: {
        id: number;
        title: Translations;
        impact: IncidentImpact;
        status: IncidentStatus;
        is_automatic: boolean;
        started_at: string;
        started_at_local: string;
        resolved_at: string | null;
        components: AffectedComponent[];
        updates: Update[];
    };
    components: Option[];
};

export default function IncidentShow({ incident, components }: Props) {
    const { t } = useTrans();

    useBreadcrumbs([
        { title: t('Incidents'), href: incidents.index() },
        { title: incident.title.ro ?? '', href: incidents.show(incident.id) },
    ]);

    return (
        <AdminPage>
            <Head title={incident.title.ro ?? t('Incident')} />
            <PageHeader
                title={incident.title.ro}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                            tone={
                                incident.status === 'resolved'
                                    ? 'operational'
                                    : incidentImpactTone[incident.impact]
                            }
                            label={t(incidentStatusLabel[incident.status])}
                        />
                        {incident.is_automatic && (
                            <span>
                                {t('Opened automatically by a monitor')}
                            </span>
                        )}
                    </span>
                }
                actions={
                    <Button variant="secondary" asChild>
                        <a
                            href={publicIncident.url(incident.id)}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink /> {t('View public page')}
                        </a>
                    </Button>
                }
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-8">
                    <PostUpdate incident={incident} />

                    <section>
                        <SectionTitle>{t('Timeline')}</SectionTitle>
                        <Surface className="divide-y divide-hairline">
                            {incident.updates.map((update) => (
                                <UpdateRow
                                    key={update.id}
                                    incidentId={incident.id}
                                    update={update}
                                    canDelete={incident.updates.length > 1}
                                />
                            ))}
                        </Surface>
                    </section>
                </div>

                <aside className="space-y-6">
                    <Details incident={incident} components={components} />
                    <div className="flex justify-end">
                        <ConfirmButton
                            href={incidents.destroy.url(incident.id)}
                            title={t('Delete this incident?')}
                            description={t(
                                'It disappears from the status page and its history. This cannot be undone.',
                            )}
                        >
                            <Trash2 /> {t('Delete incident')}
                        </ConfirmButton>
                    </div>
                </aside>
            </div>
        </AdminPage>
    );
}

function PostUpdate({ incident }: { incident: Props['incident'] }) {
    const { t } = useTrans();
    const nextStatus: IncidentStatus =
        incident.status === 'resolved' ? 'resolved' : incident.status;
    const form = useForm<{ status: IncidentStatus; message: Translations }>({
        status: nextStatus,
        message: { ro: '', ru: '', en: '' },
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(incidents.updates.store.url(incident.id), {
            preserveScroll: true,
            onSuccess: () => form.reset('message'),
        });
    };

    return (
        <Surface className="p-6">
            <form onSubmit={submit} className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2 className="text-[17px] font-semibold tracking-tight">
                        {t('Post an update')}
                    </h2>
                    <Field
                        label={t('New status')}
                        htmlFor="update-status"
                        className="w-48"
                    >
                        <NativeSelect
                            id="update-status"
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData(
                                    'status',
                                    e.target.value as IncidentStatus,
                                )
                            }
                        >
                            {incidentStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {t(incidentStatusLabel[status])}
                                </option>
                            ))}
                        </NativeSelect>
                    </Field>
                </div>
                <TranslatableField
                    id="update-message"
                    name="message"
                    label={t('Message')}
                    multiline
                    value={form.data.message}
                    errors={form.errors}
                    onChange={(v) => form.setData('message', v)}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        {form.data.status === 'resolved' &&
                        incident.status !== 'resolved'
                            ? t('Resolve incident')
                            : t('Post update')}
                    </Button>
                </div>
            </form>
        </Surface>
    );
}

function UpdateRow({
    incidentId,
    update,
    canDelete,
}: {
    incidentId: number;
    update: Update;
    canDelete: boolean;
}) {
    const { t, locale, timezone } = useTrans();
    const [editing, setEditing] = useState(false);
    const form = useForm<{ status: IncidentStatus; message: Translations }>({
        status: update.status,
        message: update.message,
    });

    if (editing) {
        return (
            <form
                className="space-y-4 p-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(
                        incidents.updates.update.url([incidentId, update.id]),
                        {
                            preserveScroll: true,
                            onSuccess: () => setEditing(false),
                        },
                    );
                }}
            >
                <NativeSelect
                    aria-label={t('Status')}
                    className="w-48"
                    value={form.data.status}
                    onChange={(e) =>
                        form.setData('status', e.target.value as IncidentStatus)
                    }
                >
                    {incidentStatuses.map((status) => (
                        <option key={status} value={status}>
                            {t(incidentStatusLabel[status])}
                        </option>
                    ))}
                </NativeSelect>
                <TranslatableField
                    id={`edit-${update.id}`}
                    name="message"
                    label={t('Message')}
                    multiline
                    value={form.data.message}
                    errors={form.errors}
                    onChange={(v) => form.setData('message', v)}
                />
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" size="sm" disabled={form.processing}>
                        {t('Save')}
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <div className="group px-5 py-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] leading-relaxed">
                    <span className="font-semibold">
                        {t(incidentStatusLabel[update.status])}
                    </span>
                    <span className="text-muted-foreground"> — </span>
                    <span className="whitespace-pre-line">
                        {update.message.ro}
                    </span>
                </p>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(true)}
                        aria-label={t('Edit')}
                    >
                        <Pencil />
                    </Button>
                    {canDelete && (
                        <ConfirmButton
                            href={incidents.updates.destroy.url([
                                incidentId,
                                update.id,
                            ])}
                            title={t('Delete this update?')}
                        >
                            <Trash2 />
                        </ConfirmButton>
                    )}
                </div>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
                {formatDateTime(update.created_at, locale, timezone)}
                {update.author && ` · ${update.author}`}
                {(!update.message.ru || !update.message.en) &&
                    ` · ${t('Not fully translated')}`}
            </p>
        </div>
    );
}

function Details({
    incident,
    components,
}: {
    incident: Props['incident'];
    components: Option[];
}) {
    const { t } = useTrans();
    const form = useForm<{
        title: Translations;
        impact: IncidentImpact;
        started_at: string;
        components: AffectedComponent[];
    }>({
        title: incident.title,
        impact: incident.impact,
        started_at: incident.started_at_local,
        components: incident.components,
    });

    return (
        <Surface className="p-6">
            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(incidents.update.url(incident.id), {
                        preserveScroll: true,
                    });
                }}
            >
                <h2 className="text-[17px] font-semibold tracking-tight">
                    {t('Details')}
                </h2>
                <TranslatableField
                    id="details-title"
                    name="title"
                    label={t('Title')}
                    value={form.data.title}
                    errors={form.errors}
                    onChange={(v) => form.setData('title', v)}
                />
                <Field
                    label={t('Impact')}
                    htmlFor="details-impact"
                    error={form.errors.impact}
                >
                    <NativeSelect
                        id="details-impact"
                        value={form.data.impact}
                        onChange={(e) =>
                            form.setData(
                                'impact',
                                e.target.value as IncidentImpact,
                            )
                        }
                    >
                        {incidentImpacts.map((impact) => (
                            <option key={impact} value={impact}>
                                {t(incidentImpactLabel[impact])}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
                <Field
                    label={t('Started at')}
                    htmlFor="details-started"
                    error={form.errors.started_at}
                >
                    <Input
                        id="details-started"
                        type="datetime-local"
                        value={form.data.started_at}
                        onChange={(e) =>
                            form.setData('started_at', e.target.value)
                        }
                    />
                </Field>
                <div className="grid gap-2">
                    <span className="text-[13px] font-medium">
                        {t('Affected components')}
                    </span>
                    <AffectedComponents
                        options={components}
                        value={form.data.components}
                        onChange={(v) => form.setData('components', v)}
                    />
                </div>
                <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    disabled={form.processing || !form.isDirty}
                >
                    {t('Save details')}
                </Button>
            </form>
        </Surface>
    );
}
