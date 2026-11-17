import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { AffectedComponents } from '@/components/admin/affected-components';
import type { AffectedComponent } from '@/components/admin/affected-components';
import { Field, NativeSelect } from '@/components/admin/field';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { TranslatableField } from '@/components/admin/translatable-field';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import {
    incidentImpactLabel,
    incidentImpacts,
    incidentStatusLabel,
    incidentStatuses,
} from '@/lib/status';
import incidents from '@/routes/admin/incidents';
import type {
    IncidentImpact,
    IncidentStatus,
    Option,
    Translations,
} from '@/types';

type IncidentData = {
    title: Translations;
    impact: IncidentImpact;
    status: IncidentStatus;
    message: Translations;
    started_at: string;
    components: AffectedComponent[];
};

export default function IncidentCreate({
    components,
}: {
    components: Option[];
}) {
    const { t } = useTrans();

    useBreadcrumbs([
        { title: t('Incidents'), href: incidents.index() },
        { title: t('Report incident'), href: incidents.create() },
    ]);

    const form = useForm<IncidentData>({
        title: { ro: '', ru: '', en: '' },
        impact: 'minor',
        status: 'investigating',
        message: { ro: '', ru: '', en: '' },
        started_at: '',
        components: [],
    });
    const { data, setData, errors, processing } = form;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(incidents.store.url());
    };

    return (
        <AdminPage>
            <Head title={t('Report incident')} />
            <PageHeader
                title={t('Report incident')}
                description={t(
                    'Publishes immediately on the status page and sends an incident.created alert.',
                )}
            />

            <form onSubmit={submit} className="max-w-2xl space-y-6">
                <Surface className="space-y-5 p-6">
                    <TranslatableField
                        id="title"
                        name="title"
                        label={t('Title')}
                        value={data.title}
                        errors={errors}
                        onChange={(v) => setData('title', v)}
                    />
                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field
                            label={t('Status')}
                            htmlFor="status"
                            error={errors.status}
                        >
                            <NativeSelect
                                id="status"
                                value={data.status}
                                onChange={(e) =>
                                    setData(
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
                        <Field
                            label={t('Impact')}
                            htmlFor="impact"
                            error={errors.impact}
                        >
                            <NativeSelect
                                id="impact"
                                value={data.impact}
                                onChange={(e) =>
                                    setData(
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
                            htmlFor="started_at"
                            error={errors.started_at}
                            hint={t('Empty means now.')}
                        >
                            <Input
                                id="started_at"
                                type="datetime-local"
                                value={data.started_at}
                                onChange={(e) =>
                                    setData('started_at', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                    <TranslatableField
                        id="message"
                        name="message"
                        label={t('Message')}
                        multiline
                        value={data.message}
                        errors={errors}
                        onChange={(v) => setData('message', v)}
                    />
                </Surface>

                <Surface className="space-y-3 p-6">
                    <h2 className="text-[15px] font-semibold">
                        {t('Affected components')}
                    </h2>
                    <AffectedComponents
                        options={components}
                        value={data.components}
                        onChange={(v) => setData('components', v)}
                    />
                </Surface>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" asChild>
                        <Link href={incidents.index()}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {t('Publish incident')}
                    </Button>
                </div>
            </form>
        </AdminPage>
    );
}
