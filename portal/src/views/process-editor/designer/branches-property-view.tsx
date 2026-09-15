import { BranchNameValidator } from '@ailaflow/shared';
import { useState } from 'react';
import { SvgIcon } from '../../common/svg-icons';
import { EditorPropertyView } from './editor-property-view';

export interface BranchesPropertyViewProps {
  branchNames: string[];
  onAdd: (branchName: string) => void;
  onDelete: (branchName: string) => void;
}

export function BranchesPropertyView(props: BranchesPropertyViewProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const newBranchNameError = validateNewBranchName(newBranchName);

  function validateNewBranchName(branchName: string): string | null {
    if (!branchName) {
      return null;
    }
    const nameError = BranchNameValidator.validateName(branchName);
    if (nameError) {
      return nameError;
    }
    if (props.branchNames.includes(branchName)) {
      return 'Branch name already exists.';
    }
    return null;
  }

  function addBranch() {
    if (!newBranchName || newBranchNameError) {
      return;
    }
    props.onAdd(newBranchName);
    setNewBranchName('');
  }

  return (
    <EditorPropertyView label="Branches">
      {props.branchNames.map(branchName => (
        <div key={branchName} className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white/60 py-1.5 pl-3 pr-1.5">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{branchName}</span>
          <button
            type="button"
            onClick={() => props.onDelete(branchName)}
            disabled={props.branchNames.length <= 1}
            className="cursor-pointer inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:text-slate-200 disabled:hover:bg-transparent"
            aria-label={`Delete branch ${branchName}`}
            title={props.branchNames.length <= 1 ? 'The last branch cannot be deleted' : 'Delete branch'}
          >
            <SvgIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={newBranchName}
            onChange={event => setNewBranchName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addBranch();
              }
            }}
            className={`h-9 w-full rounded-md border bg-white px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${
              newBranchNameError ? 'border-red-300' : 'border-slate-300'
            }`}
            placeholder="branch_name"
            aria-label="New branch name"
          />
          {newBranchNameError && <div className="px-1 pt-1 text-xs text-red-700">{newBranchNameError}</div>}
        </div>
        <button
          type="button"
          onClick={addBranch}
          disabled={!newBranchName || Boolean(newBranchNameError)}
          className="cursor-pointer inline-flex h-9 shrink-0 items-center rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          Add branch
        </button>
      </div>
    </EditorPropertyView>
  );
}
