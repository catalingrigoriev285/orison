import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Field, NativeSelect, Toggle } from '@/components/admin/field';
import { monitorTypeLabel } from '@/components/admin/monitor-state';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import monitors from '@/routes/admin/monitors';
import type { MonitorType, Option } from '@/types';

type MonitorData = {
    name: string;
    component_id: number | '';
    type: MonitorType;
    url: string;
    method: string;
    expected_status: number | '';
    keyword: string;
    host: string;
    port: number | '';
    interval_seconds: number;
    timeout_seconds: number;
    failure_threshold: number;
    is_active: boolean;
    notify: boolean;
    auto_incident: boolean;
};

type Props = {
    monitor:
        | (Partial<
              Omit<MonitorData, 'component_id' | 'port' | 'expected_status'>
          > & {
              id: number;
              component_id: number | null;
              port: number | null;
              expected_status: number | null;
          })
        | null;
    components: Option[];
};

export default function MonitorForm({ monitor, components }: Props) {
    const { t } = useTrans();
    const isEditing = monitor !== null;

    useBreadcrumbs([
        { title: t('Monitors'), href: monitors.index() },
        isEditing
            ? { title: monitor.name ?? '', href: monitors.edit(monitor.id) }
            : { title: t('New monitor'), href: monitors.create() },
    ]);

    const form = useForm<MonitorData>({
        name: monitor?.name ?? '',
        component_id: monitor?.component_id ?? '',
        type: monitor?.type ?? 'http',
        url: monitor?.url ?? 'https://',
        method: monitor?.method ?? 'GET',
        expected_status: monitor?.expected_status ?? 200,
        keyword: monitor?.keyword ?? '',
        host: monitor?.host ?? '',
        port: monitor?.port ?? '',
        interval_seconds: monitor?.interval_seconds ?? 60,
        timeout_seconds: monitor?.timeout_seconds ?? 10,
        failure_threshold: monitor?.failure_threshold ?? 2,
        is_active: monitor?.is_active ?? true,
        notify: monitor?.notify ?? true,
        auto_incident: monitor?.auto_incident ?? false,
    });
    const { data, setData, errors, processing } = form;
    const isHttp = data.type === 'http' || data.type === 'keyword';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((values) => ({
            ...values,
            component_id:
                values.component_id === '' ? null : values.component_id,
            port: values.port === '' ? null : values.port,
            expected_status:
                values.expected_status === '' ? null : values.expected_status,
        }));

        if (isEditing) {
            form.put(monitors.update.url(monitor.id));
        } else {
            form.post(monitors.store.url());
        }
    };

    const number =
        (key: keyof MonitorData) =>
        (event: React.ChangeEvent<HTMLInputElement>) =>
            setData(
                key,
                (event.target.value === ''
                    ? ''
                    : Number(event.target.value)) as never,
            );

    return (
        <AdminPage>
            <Head title={isEditing ? monitor.name : t('New monitor')} />
            <PageHeader
                title={isEditing ? t('Edit monitor') : t('New monitor')}
                description={t(
                    'Checks run from this server on a schedule; failures can open incidents and send alerts.',
                )}
            />

            <form onSubmit={submit} className="max-w-2xl space-y-6">
                <Surface className="space-y-5 p-6">
                    <Field label={t('Name')} htmlFor="name" error={errors.name}>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoFocus
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                            label={t('Type')}
                            htmlFor="type"
                            error={errors.type}
                        >
                            <NativeSelect
                                id="type"
                                value={data.type}
                                onChange={(e) =>
                                    setData(
                                        'type',
                                        e.target.value as MonitorType,
                                    )
                                }
                            >
                                {(
                                    Object.keys(
                                        monitorTypeLabel,
                                    ) as MonitorType[]
                                ).map((type) => (
                                    <option key={type} value={type}>
                                        {t(monitorTypeLabel[type])}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                        <Field
                            label={t('Component')}
                            htmlFor="component_id"
                            error={errors.component_id}
                            hint={t(
                                'Its status on the public page follows this monitor.',
                            )}
                        >
                            <NativeSelect
                                id="component_id"
                                value={data.component_id}
                                onChange={(e) =>
                                    setData(
                                        'component_id',
                                        e.target.value === ''
                                            ? ''
                                            : Number(e.target.value),
                                    )
                                }
                            >
                                <option value="">{t('None')}</option>
                                {components.map((component) => (
                                    <option
                                        key={component.id}
                                        value={component.id}
                                    >
                                        {component.name}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>
                </Surface>

                <Surface className="space-y-5 p-6">
                    <h2 className="text-[15px] font-semibold">{t('Target')}</h2>
                    {isHttp && (
                        <>
                            <Field label="URL" htmlFor="url" error={errors.url}>
                                <Input
                                    id="url"
                                    type="url"
                                    value={data.url}
                                    onChange={(e) =>
                                        setData('url', e.target.value)
                                    }
                                />
                            </Field>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field
                                    label={t('Method')}
                                    htmlFor="method"
                                    error={errors.method}
                                >
                                    <NativeSelect
                                        id="method"
                                        value={data.method}
                                        onChange={(e) =>
                                            setData('method', e.target.value)
                                        }
                                    >
                                        {['GET', 'HEAD', 'POST'].map(
                                            (method) => (
                                                <option key={method}>
                                                    {method}
                                                </option>
                                            ),
                                        )}
                                    </NativeSelect>
                                </Field>
                                <Field
                                    label={t('Expected status code')}
                                    htmlFor="expected_status"
                                    error={errors.expected_status}
                                >
                                    <Input
                                        id="expected_status"
                                        type="number"
                                        value={data.expected_status}
                                        onChange={number('expected_status')}
                                    />
                                </Field>
                            </div>
                        </>
                    )}
                    {data.type === 'keyword' && (
                        <Field
                            label={t('Keyword')}
                            htmlFor="keyword"
                            error={errors.keyword}
                            hint={t(
                                'The check fails if the response body does not contain this text.',
                            )}
                        >
                            <Input
                                id="keyword"
                                value={data.keyword}
                                onChange={(e) =>
                                    setData('keyword', e.target.value)
                                }
                            />
                        </Field>
                    )}
                    {data.type === 'tcp' && (
                        <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
                            <Field
                                label={t('Host')}
                                htmlFor="host"
                                error={errors.host}
                            >
                                <Input
                                    id="host"
                                    value={data.host}
                                    onChange={(e) =>
                                        setData('host', e.target.value)
                                    }
                                    placeholder="example.com"
                                />
                            </Field>
                            <Field
                                label={t('Port')}
                                htmlFor="port"
                                error={errors.port}
                            >
                                <Input
                                    id="port"
                                    type="number"
                                    value={data.port}
                                    onChange={number('port')}
                                />
                            </Field>
                        </div>
                    )}
                    {data.type === 'heartbeat' && (
                        <p className="rounded-xl bg-fill px-4 py-3 text-[14px] text-muted-foreground">
                            {t(
                                'After saving you get a unique URL. Call it from a scheduled job on the platform; if no call arrives within the interval, the monitor goes down.',
                            )}
                        </p>
                    )}
                </Surface>

                <Surface className="space-y-5 p-6">
                    <h2 className="text-[15px] font-semibold">
                        {t('Schedule')}
                    </h2>
                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field
                            label={t('Interval (seconds)')}
                            htmlFor="interval_seconds"
                            error={errors.interval_seconds}
                        >
                            <Input
                                id="interval_seconds"
                                type="number"
                                min={30}
                                value={data.interval_seconds}
                                onChange={number('interval_seconds')}
                            />
                        </Field>
                        <Field
                            label={t('Timeout (seconds)')}
                            htmlFor="timeout_seconds"
                            error={errors.timeout_seconds}
                        >
                            <Input
                                id="timeout_seconds"
                                type="number"
                                min={1}
                                max={60}
                                value={data.timeout_seconds}
                                onChange={number('timeout_seconds')}
                            />
                        </Field>
                        <Field
                            label={t('Failures before down')}
                            htmlFor="failure_threshold"
                            error={errors.failure_threshold}
                        >
                            <Input
                                id="failure_threshold"
                                type="number"
                                min={1}
                                max={10}
                                value={data.failure_threshold}
                                onChange={number('failure_threshold')}
                            />
                        </Field>
                    </div>
                </Surface>

                <Surface className="divide-y divide-hairline">
                    <div className="p-5">
                        <Toggle
                            id="is_active"
                            label={t('Active')}
                            description={t('Paused monitors are not checked.')}
                            checked={data.is_active}
                            onChange={(v) => setData('is_active', v)}
                        />
                    </div>
                    <div className="p-5">
                        <Toggle
                            id="notify"
                            label={t('Send alerts')}
                            description={t(
                                'POST to the webhook when this monitor goes down or recovers.',
                            )}
                            checked={data.notify}
                            onChange={(v) => setData('notify', v)}
                        />
                    </div>
                    <div className="p-5">
                        <Toggle
                            id="auto_incident"
                            label={t('Open incidents automatically')}
                            description={t(
                                'Publish an incident on the status page while the monitor is down, and resolve it on recovery.',
                            )}
                            checked={data.auto_incident}
                            onChange={(v) => setData('auto_incident', v)}
                        />
                    </div>
                </Surface>

                <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" asChild>
                        <Link
                            href={
                                isEditing
                                    ? monitors.show(monitor.id)
                                    : monitors.index()
                            }
                        >
                            {t('Cancel')}
                        </Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEditing ? t('Save changes') : t('Create monitor')}
                    </Button>
                </div>
            </form>
        </AdminPage>
    );
}
