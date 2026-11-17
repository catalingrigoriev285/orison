import { NativeSelect } from '@/components/admin/field';
import { useTrans } from '@/hooks/use-trans';
import { componentStatusLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { ComponentStatus, Option } from '@/types';

export type AffectedComponent = { id: number; status: ComponentStatus };

const selectable: ComponentStatus[] = [
    'degraded_performance',
    'partial_outage',
    'major_outage',
    'operational',
];

/**
 * Pick the components an incident affects and how badly.
 */
export function AffectedComponents({
    options,
    value,
    onChange,
    defaultStatus = 'partial_outage',
}: {
    options: Option[];
    value: AffectedComponent[];
    onChange: (value: AffectedComponent[]) => void;
    defaultStatus?: ComponentStatus;
}) {
    const { t } = useTrans();

    return (
        <div className="divide-y divide-hairline overflow-hidden rounded-[14px] border border-hairline">
            {options.map((option) => {
                const selected = value.find((item) => item.id === option.id);

                return (
                    <div
                        key={option.id}
                        className={cn(
                            'flex items-center justify-between gap-3 px-4 py-2.5',
                            selected && 'bg-fill',
                        )}
                    >
                        <label className="flex min-w-0 cursor-pointer items-center gap-3 text-[14px]">
                            <input
                                type="checkbox"
                                className="size-4 accent-[var(--primary)]"
                                checked={!!selected}
                                onChange={(event) =>
                                    onChange(
                                        event.target.checked
                                            ? [
                                                  ...value,
                                                  {
                                                      id: option.id,
                                                      status: defaultStatus,
                                                  },
                                              ]
                                            : value.filter(
                                                  (item) =>
                                                      item.id !== option.id,
                                              ),
                                    )
                                }
                            />
                            <span className="truncate font-medium">
                                {option.name}
                            </span>
                        </label>
                        {selected && (
                            <NativeSelect
                                aria-label={t('Status')}
                                className="w-40 shrink-0 [&_select]:h-8 [&_select]:text-[13px]"
                                value={selected.status}
                                onChange={(event) =>
                                    onChange(
                                        value.map((item) =>
                                            item.id === option.id
                                                ? {
                                                      ...item,
                                                      status: event.target
                                                          .value as ComponentStatus,
                                                  }
                                                : item,
                                        ),
                                    )
                                }
                            >
                                {selectable.map((status) => (
                                    <option key={status} value={status}>
                                        {t(componentStatusLabel[status])}
                                    </option>
                                ))}
                            </NativeSelect>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
