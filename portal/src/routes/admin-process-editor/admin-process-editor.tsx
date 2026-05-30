import { useState } from 'react';
import { AdminPortalLayout } from '../../components/layouts/admin-portal-layout';
import { Router } from './router';
import { AdminProcessEditorContext } from './admin-process-editor-context';

export function AdminProcessEditor() {
  const [processName, setProcessName] = useState('Process name');

  return (
    <AdminPortalLayout disableScroll={true}>
      <AdminProcessEditorContext>
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Router />
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={processName}
                  onChange={e => setProcessName(e.target.value)}
                  className="h-9 w-full max-w-md rounded-md border border-transparent bg-transparent px-2 text-lg font-semibold tracking-tight text-slate-900 outline-none transition-colors hover:border-slate-200 hover:bg-slate-50 focus:border-slate-300 focus:bg-white"
                />
              </div>

              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </AdminProcessEditorContext>
    </AdminPortalLayout>
  );
}
