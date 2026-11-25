import { Switch } from "radix-ui";

export function SyncPreferencesSwitches({
  syncPreferences,
  onToggleCategory,
  disabled = false,
}) {
  return (
    <div role="group" aria-label="What to sync with your LM Subs account">
      <div className="switch-row">
        <div>
          <label className="switch-label" htmlFor="switch-sync-keys">
            Sync encrypted API keys
          </label>
          <div className="switch-desc">
            Encrypts your speech-to-text API keys with per-user HKDF-SHA256 and AES-256-GCM before storing them in Postgres.
          </div>
        </div>
        <Switch.Root
          id="switch-sync-keys"
          className="radix-switch-root"
          checked={Boolean(syncPreferences.syncApiKeys)}
          disabled={disabled}
          onCheckedChange={(checked) => onToggleCategory("syncApiKeys", checked)}
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>

      <div className="switch-row">
        <div>
          <label className="switch-label" htmlFor="switch-sync-transcripts">
            Sync Video and Audio Overview transcriptions
          </label>
          <div className="switch-desc">
            Stores generated caption cues so opening the same NotebookLM Video or Audio Overview on another computer loads captions immediately.
          </div>
        </div>
        <Switch.Root
          id="switch-sync-transcripts"
          className="radix-switch-root"
          checked={Boolean(syncPreferences.syncTranscripts)}
          disabled={disabled}
          onCheckedChange={(checked) => onToggleCategory("syncTranscripts", checked)}
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>

      <div className="switch-row">
        <div>
          <label className="switch-label" htmlFor="switch-sync-settings">
            Sync caption and queue preferences
          </label>
          <div className="switch-desc">
            Keeps your provider failover order, default language hint, and caption font size consistent everywhere.
          </div>
        </div>
        <Switch.Root
          id="switch-sync-settings"
          className="radix-switch-root"
          checked={Boolean(syncPreferences.syncSettings)}
          disabled={disabled}
          onCheckedChange={(checked) => onToggleCategory("syncSettings", checked)}
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>
    </div>
  );
}
