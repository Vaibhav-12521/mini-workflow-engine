import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { STATUSES } from '@mwe/shared';
import { tasksApi } from '../api/client';

/** Task count per status (and in total), shown in the sidebar and the list header. */
export interface PipelineCounts {
  total: number;
  byStatus: Record<string, number>;
}

interface PipelineContextValue {
  counts: PipelineCounts | null;
  refresh: () => void;
}

const PipelineContext = createContext<PipelineContextValue>({ counts: null, refresh: () => {} });

/**
 * Counts come from the existing list endpoint (`pageSize=1`, read `pagination.total`),
 * one request per status from the shared definition, so a new status shows up here automatically.
 */
export function PipelineProvider({ children, refreshKey }: { children: ReactNode; refreshKey: string }) {
  const [counts, setCounts] = useState<PipelineCounts | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const id = ++requestId.current;
    Promise.all([
      tasksApi.list({ pageSize: 1 }),
      ...STATUSES.map((s) => tasksApi.list({ status: s.value, pageSize: 1 })),
    ]).then(
      ([all, ...per]) => {
        if (id !== requestId.current) return;
        setCounts({
          total: all.pagination.total,
          byStatus: Object.fromEntries(STATUSES.map((s, i) => [s.value, per[i].pagination.total])),
        });
      },
      () => {
        /* counts are decorative; the list page shows the real error state */
      },
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  return <PipelineContext.Provider value={{ counts, refresh }}>{children}</PipelineContext.Provider>;
}

export const usePipeline = () => useContext(PipelineContext);
