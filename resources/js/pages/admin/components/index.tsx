import { Head, Link, useForm } from '@inertiajs/react';
import { EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { Field } from '@/components/admin/field';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { TranslatableField } from '@/components/admin/translatable-field';
import { StatusBadge } from '@/components/status/status-badge';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { componentStatusLabel, componentStatusTone } from '@/lib/status';
import componentGroups from '@/routes/admin/component-groups';
import componentRoutes from '@/routes/admin/components';
import type { ComponentStatus, Translations } from '@/types';

type Row = {
    id: number;
    name: string;
    slug: string;
    group_id: number | null;
    status: ComponentStatus;
    status_override: ComponentStatus | null;
    is_visible: boolean;
    sort_order: number;
    monitors_count: number;
};

type Group = {
    id: number;
    name: Translations;
    label: string;
    sort_order: number;
};

export default function ComponentsIndex({
    components,
    groups,
}: {
    components: Row[];
    groups: Group[];
}) {
    const { t } = useTrans();
    const [editingGroup, setEditingGroup] = useState<Group | 'new' | null>(
        null,
    );

    useBreadcrumbs([{ title: t('Components'), href: componentRoutes.index() }]);

    const sections = [
        ...groups.map((group) => ({
            group,
            items: components.filter((c) => c.group_id === group.id),
        })),
        { group: null, items: components.filter((c) => c.group_id === null) },
    ].filter((section) => section.group !== null || section.items.length > 0);

    return (
        <AdminPage>
            <Head title={t('Components')} />
            <PageHeader
                title={t('Components')}
                description={t(
                    'The services visitors see on the status page, grouped and ordered.',
                )}
                actions={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setEditingGroup('new')}
                        >
                            <Plus /> {t('New group')}
                        </Button>
                        <Button asChild>
                            <Link href={componentRoutes.create()}>
                                <Plus /> {t('New component')}
                            </Link>
                        </Button>
                    </>
                }
            />

            {components.length === 0 && groups.length === 0 ? (
                <Surface>
                    <EmptyState
                        title={t('No components yet')}
                        description={t(
                            'Components are the services listed on the public page.',
                        )}
                    />
                </Surface>
            ) : (
                <div className="space-y-8">
                    {sections.map(({ group, items }) => (
                        <section key={group?.id ?? 'none'}>
                            <SectionTitle
                                action={
                                    group && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setEditingGroup(group)
                                                }
                                            >
                                                <Pencil /> {t('Edit group')}
                                            </Button>
                                            <ConfirmButton
                                                href={componentGroups.destroy.url(
                                                    group.id,
                                                )}
                                                title={t('Delete this group?')}
                                                description={t(
                                                    'Its components stay, without a group.',
                                                )}
                                            >
                                                <Trash2 />
                                            </ConfirmButton>
                                        </div>
                                    )
                                }
                            >
                                {group?.label ?? t('Without group')}
                            </SectionTitle>
                            <Surface className="divide-y divide-hairline">
                                {items.length === 0 && (
                                    <p className="px-5 py-5 text-[14px] text-muted-foreground">
                                        {t('No components in this group.')}
                                    </p>
                                )}
                                {items.map((component) => (
                                    <Link
                                        key={component.id}
                                        href={componentRoutes.edit(
                                            component.id,
                                        )}
                                        className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-accent"
                                    >
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-2 truncate text-[15px] font-medium">
                                                {component.name}
                                                {!component.is_visible && (
                                                    <EyeOff className="size-3.5 text-muted-foreground" />
                                                )}
                                            </p>
                                            <p className="text-[12px] text-muted-foreground">
                                                {component.slug} ·{' '}
                                                {t(':count monitors', {
                                                    count: component.monitors_count,
                                                })}
                                                {component.status_override &&
                                                    ` · ${t('Manual status')}`}
                                            </p>
                                        </div>
                                        <StatusBadge
                                            tone={
                                                componentStatusTone[
                                                    component.status
                                                ]
                                            }
                                            label={t(
                                                componentStatusLabel[
                                                    component.status
                                                ],
                                            )}
                                        />
                                    </Link>
                                ))}
                            </Surface>
                        </section>
                    ))}
                </div>
            )}

            {editingGroup !== null && (
                <GroupDialog
                    key={editingGroup === 'new' ? 'new' : editingGroup.id}
                    group={editingGroup === 'new' ? null : editingGroup}
                    nextSortOrder={groups.length + 1}
                    onClose={() => setEditingGroup(null)}
                />
            )}
        </AdminPage>
    );
}

function GroupDialog({
    group,
    nextSortOrder,
    onClose,
}: {
    group: Group | null;
    nextSortOrder: number;
    onClose: () => void;
}) {
    const { t } = useTrans();
    const form = useForm<{ name: Translations; sort_order: number }>({
        name: group?.name ?? { ro: '', ru: '', en: '' },
        sort_order: group?.sort_order ?? nextSortOrder,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (group) {
            form.put(componentGroups.update.url(group.id), options);
        } else {
            form.post(componentGroups.store.url(), options);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="rounded-[20px] sm:max-w-md">
                <DialogTitle>
                    {group ? t('Edit group') : t('New group')}
                </DialogTitle>
                <form onSubmit={submit} className="space-y-5">
                    <TranslatableField
                        id="group-name"
                        name="name"
                        label={t('Name')}
                        value={form.data.name}
                        onChange={(value) => form.setData('name', value)}
                        errors={form.errors}
                    />
                    <Field
                        label={t('Order')}
                        htmlFor="group-sort"
                        error={form.errors.sort_order}
                    >
                        <Input
                            id="group-sort"
                            type="number"
                            min={0}
                            value={form.data.sort_order}
                            onChange={(e) =>
                                form.setData(
                                    'sort_order',
                                    Number(e.target.value),
                                )
                            }
                        />
                    </Field>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {t('Save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
