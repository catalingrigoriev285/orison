import { Head, Link, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { Field } from '@/components/admin/field';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { TranslatableField } from '@/components/admin/translatable-field';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';
import maintenances from '@/routes/admin/maintenances';
import type { Option, Translations } from '@/types';

type MaintenanceData = {
    title: Translations;
    description: Translations;
    scheduled_start: string;
    scheduled_end: string;
    components: number[];
};

type Props = {
    maintenance:
        | (Omit<MaintenanceData, 'description'> & {
              id: number;
              description: Translations | null;
          })
        | null;
    components: Option[];
};

export default function MaintenanceForm({ maintenance, components }: Props) {
    const { t, timezone } = useTrans();
    const isEditing = maintenance !== null;

    useBreadcrumbs([
        { title: t('Maintenance'), href: maintenances.index() },
        isEditing
            ? {
                  title: maintenance.title.ro ?? '',
                  href: maintenances.edit(maintenance.id),
              }
            : { title: t('Schedule maintenance'), href: maintenances.create() },
    ]);

    const form = useForm<MaintenanceData>({
        title: maintenance?.title ?? { ro: '', ru: '', en: '' },
        description: maintenance?.description ?? { ro: '', ru: '', en: '' },
        scheduled_start: maintenance?.scheduled_start ?? '',
        scheduled_end: maintenance?.scheduled_end ?? '',
        components: maintenance?.components ?? [],
    });
    const { data, setData, errors, processing } = form;

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (isEditing) {
            form.put(maintenances.update.url(maintenance.id));
        } else {
            form.post(maintenances.store.url());
        }
    };

    const toggleComponent = (id: number) =>
        setData(
            'components',
            data.components.includes(id)
                ? data.components.filter((c) => c !== id)
                : [...data.components, id],
        );

    return (
        <AdminPage>
            <Head
                title={
                    isEditing
                        ? t('Edit maintenance')
                        : t('Schedule maintenance')
                }
            />
            <PageHeader
                title={
                    isEditing
                        ? t('Edit maintenance')
                        : t('Schedule maintenance')
                }
                description={t('Times are in :timezone.', { timezone })}
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
                    <TranslatableField
                        id="description"
                        name="description"
                        label={t('Description')}
                        multiline
                        required={false}
                        value={data.description}
                        errors={errors}
                        onChange={(v) => setData('description', v)}
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                            label={t('Starts')}
                            htmlFor="scheduled_start"
                            error={errors.scheduled_start}
                        >
                            <Input
                                id="scheduled_start"
                                type="datetime-local"
                                value={data.scheduled_start}
                                onChange={(e) =>
                                    setData('scheduled_start', e.target.value)
                                }
                                required
                            />
                        </Field>
                        <Field
                            label={t('Ends')}
                            htmlFor="scheduled_end"
                            error={errors.scheduled_end}
                        >
                            <Input
                                id="scheduled_end"
                                type="datetime-local"
                                value={data.scheduled_end}
                                onChange={(e) =>
                                    setData('scheduled_end', e.target.value)
                                }
                                required
                            />
                        </Field>
                    </div>
                </Surface>

                <Surface className="space-y-3 p-6">
                    <h2 className="text-[15px] font-semibold">
                        {t('Affected components')}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {components.map((component) => {
                            const selected = data.components.includes(
                                component.id,
                            );

                            return (
                                <button
                                    key={component.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                        toggleComponent(component.id)
                                    }
                                    className={cn(
                                        'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
                                        selected
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-input bg-card text-foreground hover:bg-accent',
                                    )}
                                >
                                    {component.name}
                                </button>
                            );
                        })}
                    </div>
                </Surface>

                <div className="flex items-center justify-between gap-2">
                    <div>
                        {isEditing && (
                            <ConfirmButton
                                href={maintenances.destroy.url(maintenance.id)}
                                title={t('Delete this maintenance?')}
                            >
                                <Trash2 /> {t('Delete')}
                            </ConfirmButton>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" asChild>
                            <Link href={maintenances.index()}>
                                {t('Cancel')}
                            </Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {isEditing ? t('Save changes') : t('Schedule')}
                        </Button>
                    </div>
                </div>
            </form>
        </AdminPage>
    );
}
