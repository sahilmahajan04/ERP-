'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  oldValue: string | null;
  newValue: string | null;
  referenceId: string | null;
  timestamp: string;
  user: { firstName: string; lastName: string; email: string; role: string };
}

export default function AuditLogsPage() {
  const [moduleFilter, setModuleFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data: logsResponse, isLoading } = useQuery<{ data: AuditLog[] }>({
    queryKey: ['auditLogs', moduleFilter],
    queryFn: () => {
      const params: any = { limit: '100' };
      if (moduleFilter) params.module = moduleFilter;
      return api.get('/audit-logs', { params });
    },
    refetchInterval: 12000,
  });

  const toggleExpand = (id: string) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  const formatJSON = (val: string | null) => {
    if (!val) return 'None';
    try {
      const parsed = JSON.parse(val);
      return <pre className="text-[10px] p-2 bg-slate-900 text-emerald-450 font-mono rounded overflow-x-auto max-w-full">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      return <span className="font-mono text-xs">{val}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Audit Security Logs</h1>
          <p className="text-slate-500 text-sm font-medium">Trace data changes, status transitions, and user events across modules</p>
        </div>

        {/* Filter */}
        <select
          className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm"
          value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
        >
          <option value="">All Modules</option>
          <option value="AUTH">AUTH</option>
          <option value="PRODUCT">PRODUCT</option>
          <option value="INVENTORY">INVENTORY</option>
          <option value="SALES">SALES</option>
          <option value="PURCHASE">PURCHASE</option>
          <option value="MANUFACTURING">MANUFACTURING</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading security database logs...</div>
        ) : !logsResponse?.data || logsResponse.data.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No logs found matching search criteria.</div>
        ) : (
          <div className="divide-y divide-slate-150 dark:divide-slate-700/60 text-sm">
            {logsResponse.data.map((log) => {
              const active = expandedLog === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/40 dark:hover:bg-slate-700/10 transition-all space-y-3">
                  <div className="flex justify-between items-start cursor-pointer" onClick={() => toggleExpand(log.id)}>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-850 dark:text-slate-200 flex items-center">
                        <span className="mr-2 px-2 py-0.5 text-[9px] font-bold rounded uppercase bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {log.module}
                        </span>
                        {log.action.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-400">
                        Executed by: <span className="font-semibold text-slate-650 dark:text-slate-350">{log.user.firstName} {log.user.lastName} ({log.user.email})</span> — <span className="capitalize">{log.user.role.toLowerCase().replace('_', ' ')}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-1.5">
                      <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                      <span className="text-xs text-indigo-500 font-bold hover:underline select-none">
                        {active ? '▲ Hide Details' : '▼ View Payload'}
                      </span>
                    </div>
                  </div>

                  {active && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-750/30 border border-slate-205 dark:border-slate-700 rounded-xl animate-fade-in">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous state</h4>
                        <div className="overflow-x-auto">{formatJSON(log.oldValue)}</div>
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">New state</h4>
                        <div className="overflow-x-auto">{formatJSON(log.newValue)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
