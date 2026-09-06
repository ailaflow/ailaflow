import { LicenseType } from '@aila/model';

export interface LicenseSelectorViewProps {
  licenseType: LicenseType;
  licenseKey: string;
  hasLicenseKey?: boolean;
  disabled: boolean;
  onLicenseTypeChange(type: LicenseType): void;
  onLicenseKeyChange(key: string): void;
}

export function LicenseSelectorView(props: LicenseSelectorViewProps) {
  return (
    <fieldset disabled={props.disabled} className="space-y-3">
      <legend className="mb-2 text-sm font-medium text-slate-700">License type</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { type: LicenseType.HOME, label: 'Home', description: 'Free for personal, non-commercial use.' },
          { type: LicenseType.PRO, label: 'Pro', description: 'For companies and commercial use.' }
        ].map(option => (
          <label
            key={option.type}
            className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${
              props.licenseType === option.type ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
            }`}
          >
            <input
              type="radio"
              name="licenseType"
              value={option.type}
              checked={props.licenseType === option.type}
              onChange={() => props.onLicenseTypeChange(option.type)}
              className="mt-1 accent-slate-900"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">{option.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      {props.licenseType === LicenseType.PRO && (
        <div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">License key</span>
            {props.hasLicenseKey && (
              <span className="block text-xs text-slate-500">A license key is saved. Enter a key to replace it.</span>
            )}
            <input
              name="licenseKey"
              type="password"
              autoComplete="off"
              required
              value={props.licenseKey}
              onChange={event => props.onLicenseKeyChange(event.target.value)}
              placeholder="Enter your Pro license key"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
          <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Using Aila for your business?{' '}
            <a
              // TODO: Replace with the license purchase URL.
              href="https://example.com/purchase-license"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
            >
              Purchase a Pro license
            </a>
            .
          </p>
        </div>
      )}
    </fieldset>
  );
}
