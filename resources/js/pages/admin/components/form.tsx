import { Head, Link, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { Field, NativeSelect, Toggle } from '@/components/admin/field';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { TranslatableField } from '@/components/admin/translatable-field';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { componentStatusLabel, componentStatuses } from '@/lib/status';
import componentRoutes from '@/routes/admin/components';
import type { ComponentStatus, Translations } from '@/types';

type ComponentData = {
    name: Translations;
    description: Translations;
    slug: string;
    component_group_id: number | '';
    sort_order: number;
    is_visible: boolean;
    status_override: ComponentStatus | '';
};

type Props = {
    component: {
        id: number;
        name: Translations;
        description: Translations | null;
        slug: string;
        component_group_id: number | null;
        sort_order: number;
        is_visible: boolean;
        status_override: ComponentStatus | null;
    } | null;
    groups: { id: number; label: string }[];
    nextSortOrder: number;
};

const slugify = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export default function ComponentForm({
    component,
    groups,
    nextSortOrder,
}: Props) {
    const { t, translated } = useTrans();
    const isEditing = component !== null;

    useBreadcrumbs([
        { title: t('Components'), href: componentRoutes.index() },
        isEditing
            ? {
                  title: translated(component.name),
                  href: componentRoutes.edit(component.id),
              }
            : { title: t('New component'), href: componentRoutes.create() },
    ]);

    const form = useForm<ComponentData>({
        name: component?.name ?? { ro: '', ru: '', en: '' },
        description: component?.description ?? { ro: '', ru: '', en: '' },
        slug: component?.slug ?? '',
        component_group_id:
            component?.component_group_id ?? groups[0]?.id ?? '',
        sort_order: component?.sort_order ?? nextSortOrder,
        is_visible: component?.is_visible ?? true,
        status_override: component?.status_override ?? '',
    });
    const { data, setData, errors, processing } = form;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((values) => ({
            ...values,
            component_group_id:
                values.component_group_id === ''
                    ? null
                    : values.component_group_id,
            status_override:
                values.status_override === '' ? null : values.status_override,
        }));

        if (isEditing) {
            form.put(componentRoutes.update.url(component.id));
        } else {
            form.post(componentRoutes.store.url());
        }
    };

    return (
        <AdminPage>
            <Head
                title={isEditing ? t('Edit component') : t('New component')}
            />
            <PageHeader
                title={isEditing ? t('Edit component') : t('New component')}
            />

            <form onSubmit={submit} className="max-w-2xl space-y-6">
                <Surface className="space-y-5 p-6">
                    <TranslatableField
                        id="name"
                        name="name"
                        label={t('Name')}
                        value={data.name}
                        errors={errors}
                        onChange={(value) => {
                            setData((current) => ({
                                ...current,
                                name: value,
                                slug:
                                    isEditing ||
                                    current.slug !==
                                        slugify(translated(current.name))
                                        ? current.slug
                                        : slugify(translated(value)),
                            }));
                        }}
                    />
                    <TranslatableField
                        id="description"
                        name="description"
                        label={t('Description')}
                        value={data.description}
                        errors={errors}
                        required={false}
                        onChange={(value) => setData('description', value)}
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                            label={t('Slug')}
                            htmlFor="slug"
                            error={errors.slug}
                            hint={t('Used in the public JSON API.')}
                        >
                            <Input
                                id="slug"
                                value={data.slug}
                                onChange={(e) =>
                                    setData('slug', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label={t('Group')}
                            htmlFor="group"
                            error={errors.component_group_id}
                        >
                            <NativeSelect
                                id="group"
                                value={data.component_group_id}
                                onChange={(e) =>
                                    setData(
                                        'component_group_id',
                                        e.target.value === ''
                                            ? ''
                                            : Number(e.target.value),
                                    )
                                }
                            >
                                <option value="">{t('Without group')}</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                        <Field
                            label={t('Order')}
                            htmlFor="sort_order"
                            error={errors.sort_order}
                        >
                            <Input
                                id="sort_order"
                                type="number"
                                min={0}
                                value={data.sort_order}
                                onChange={(e) =>
                                    setData(
                                        'sort_order',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </Field>
                        <Field
                            label={t('Status')}
                            htmlFor="status_override"
                            error={errors.status_override}
                            hint={t(
                                'Automatic follows monitors, incidents and maintenance.',
                            )}
                        >
                            <NativeSelect
                                id="status_override"
                                value={data.status_override}
                                onChange={(e) =>
                                    setData(
                                        'status_override',
                                        e.target.value as ComponentStatus | '',
                                    )
                                }
                            >
                                <option value="">{t('Automatic')}</option>
                                {componentStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {t(componentStatusLabel[status])}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>
                </Surface>

                <Surface className="p-5">
                    <Toggle
                        id="is_visible"
                        label={t('Show on status page')}
                        description={t(
                            'Hidden components are still monitored.',
                        )}
                        checked={data.is_visible}
                        onChange={(value) => setData('is_visible', value)}
                    />
                </Surface>

                <div className="flex items-center justify-between gap-2">
                    <div>
                        {isEditing && (
                            <ConfirmButton
                                href={componentRoutes.destroy.url(component.id)}
                                title={t('Delete this component?')}
                                description={t(
                                    'Its monitors are kept but detached, and its uptime history is deleted.',
                                )}
                            >
                                <Trash2 /> {t('Delete')}
                            </ConfirmButton>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" asChild>
                            <Link href={componentRoutes.index()}>
                                {t('Cancel')}
                            </Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {isEditing
                                ? t('Save changes')
                                : t('Create component')}
                        </Button>
                    </div>
                </div>
            </form>
        </AdminPage>
    );
}
