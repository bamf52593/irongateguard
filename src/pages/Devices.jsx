import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [sentinels, setSentinels] = useState([]);
  const [events, setEvents] = useState([]);
  const [deviceSuffix] = useState(() => Math.random().toString(36).slice(2, 6));
  const [setupForm, setSetupForm] = useState({
    businessName: '',
    sentinelName: '',
    apiKey: 'test-key',
    os: 'windows'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBase = (import.meta.env.VITE_API_URL || `${window.location.origin}/v1`).replace(/\/$/, '');

  const slugify = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const sentinelId = `${slugify(setupForm.businessName) || 'office'}-${slugify(setupForm.sentinelName) || `device-${deviceSuffix}`}`;

  const windowsCommand = [
    `$env:IRONGATE_API_BASE = "${apiBase}"`,
    `$env:IRONGATE_API_KEY = "${setupForm.apiKey || 'test-key'}"`,
    `$env:IRONGATE_SENTINEL_ID = "${sentinelId}"`,
    'npm run sentinel'
  ].join('\n');

  const macLinuxCommand = [
    `export IRONGATE_API_BASE="${apiBase}"`,
    `export IRONGATE_API_KEY="${setupForm.apiKey || 'test-key'}"`,
    `export IRONGATE_SENTINEL_ID="${sentinelId}"`,
    'npm run sentinel'
  ].join('\n');

  const oneLineWindowsCommand = [
    `$env:IRONGATE_API_BASE=\"${apiBase}\";`,
    `$env:IRONGATE_API_KEY=\"${setupForm.apiKey || 'test-key'}\";`,
    `$env:IRONGATE_SENTINEL_ID=\"${sentinelId}\";`,
    'npm run sentinel'
  ].join(' ');

  const oneLineMacLinuxCommand = [
    `IRONGATE_API_BASE=\"${apiBase}\"`,
    `IRONGATE_API_KEY=\"${setupForm.apiKey || 'test-key'}\"`,
    `IRONGATE_SENTINEL_ID=\"${sentinelId}\"`,
    'npm run sentinel'
  ].join(' ');

  const activeBlockCommand = setupForm.os === 'windows' ? windowsCommand : macLinuxCommand;
  const activeOneLineCommand = setupForm.os === 'windows' ? oneLineWindowsCommand : oneLineMacLinuxCommand;

  const copyText = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: `${label} copied.` } }));
    } catch {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'warning', message: `Could not copy ${label}. Please copy manually.` } }));
    }
  };

  const downloadScript = (value, os) => {
    try {
      const filename = os === 'windows' ? 'irongate-setup.ps1' : 'irongate-setup.sh';
      const blob = new Blob([`${value}\n`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: `Downloaded ${filename}.` } }));
    } catch {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'warning', message: 'Could not download setup script. Please copy manually.' } }));
    }
  };

  const updateSetupField = (field) => (event) => {
    setSetupForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetFriendlyNames = () => {
    setSetupForm((prev) => ({
      ...prev,
      businessName: '',
      sentinelName: ''
    }));
  };

  const loadProtectionData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      axios.get('/v1/devices'),
      axios.get('/v1/sentinels'),
      axios.get('/v1/events')
    ])
      .then(([devicesRes, sentinelsRes, eventsRes]) => {
        setDevices(devicesRes.data.devices || []);
        setSentinels(sentinelsRes.data.sentinels || []);
        setEvents(eventsRes.data.events || []);
      })
      .catch(() => setError('Unable to load protection data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProtectionData();
  }, []);

  const onlineDevices = devices.filter((device) => String(device.status).toLowerCase() === 'online').length;
  const onlineSentinels = sentinels.filter((sentinel) => String(sentinel.status).toLowerCase() === 'online').length;
  const criticalEvents = events.filter((event) => ['critical', 'alert'].includes(String(event.severity || '').toLowerCase())).length;
  const protectionMode = onlineSentinels > 0 ? 'Active 24/7' : 'Attention needed';

  return (
    <div className="page">
      <h1>Assets</h1>
      <div className="banner-panel">
        <p>
          IronGate protects your business continuously by collecting telemetry from connected devices,
          detecting attack signals, and keeping your team informed in real time.
        </p>
      </div>
      {loading ? (
        <p>Loading protected assets...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div className="card-grid protection-grid">
            <div className="card stat-card">
              <h2>Protection Mode</h2>
              <p className={`metric ${onlineSentinels > 0 ? 'status-good' : 'status-warning'}`}>{protectionMode}</p>
              <p className="empty-state">Live defense depends on at least one online sentinel.</p>
            </div>
            <div className="card stat-card">
              <h2>Connected Assets</h2>
              <p className="metric">{devices.length}</p>
              <p className="empty-state">{onlineDevices} currently reporting as online.</p>
            </div>
            <div className="card stat-card">
              <h2>Sentinels Online</h2>
              <p className="metric">{onlineSentinels}</p>
              <p className="empty-state">These are continuously collecting security telemetry.</p>
            </div>
            <div className="card stat-card">
              <h2>High-Risk Signals</h2>
              <p className={`metric ${criticalEvents > 0 ? 'status-warning' : 'status-good'}`}>{criticalEvents}</p>
              <p className="empty-state">Critical or alert-level events seen in the latest stream.</p>
            </div>
          </div>

          <div className="card">
            <h2>Easy setup builder (for non-technical users)</h2>
            <p className="section-intro">
              Fast path: choose computer type and paste your API key. The rest is optional.
            </p>

            <div className="setup-builder-grid">
              <label className="setup-field">
                <span>API key</span>
                <input
                  type="text"
                  value={setupForm.apiKey}
                  onChange={updateSetupField('apiKey')}
                  placeholder="paste your API key"
                />
              </label>

              <label className="setup-field">
                <span>Computer type</span>
                <select value={setupForm.os} onChange={updateSetupField('os')}>
                  <option value="windows">Windows (PowerShell)</option>
                  <option value="maclinux">Mac/Linux (Terminal)</option>
                </select>
              </label>
            </div>

            <details className="advanced-setup">
              <summary>Optional advanced naming</summary>
              <div className="setup-builder-grid">
                <label className="setup-field">
                  <span>Business or location name (optional)</span>
                  <input
                    type="text"
                    value={setupForm.businessName}
                    onChange={updateSetupField('businessName')}
                    placeholder="main-office"
                  />
                </label>

                <label className="setup-field">
                  <span>Computer nickname (optional)</span>
                  <input
                    type="text"
                    value={setupForm.sentinelName}
                    onChange={updateSetupField('sentinelName')}
                    placeholder="front-desk"
                  />
                </label>
              </div>
              <button type="button" className="snippet-copy" onClick={resetFriendlyNames}>Use automatic naming</button>
            </details>

            <div className="onboarding-steps quickstart-steps">
              <div className="onboarding-step">
                <strong>1. Open terminal</strong>
                <p>Windows: open PowerShell. Mac/Linux: open Terminal.</p>
              </div>
              <div className="onboarding-step">
                <strong>2. Copy and paste the command below</strong>
                <p>It connects this computer to your IronGate account using your API key.</p>
              </div>
              <div className="onboarding-step">
                <strong>3. Confirm it appears in monitored assets</strong>
                <p>This page will show the new device once events begin reporting.</p>
              </div>
            </div>

            <div className="snippet-block generated-command-block">
              <div className="snippet-header">
                <h3>Generated setup command ({setupForm.os === 'windows' ? 'Windows' : 'Mac/Linux'})</h3>
                <div className="snippet-actions">
                  <button type="button" className="snippet-copy" onClick={() => copyText('Generated setup command', activeBlockCommand)}>Copy</button>
                  <button type="button" className="snippet-copy" onClick={() => downloadScript(activeBlockCommand, setupForm.os)}>Download</button>
                </div>
              </div>
              <pre>{activeBlockCommand}</pre>
            </div>

            <div className="snippet-block generated-command-block">
              <div className="snippet-header">
                <h3>One-line version</h3>
                <button type="button" className="snippet-copy" onClick={() => copyText('One-line setup command', activeOneLineCommand)}>Copy</button>
              </div>
              <pre>{activeOneLineCommand}</pre>
            </div>

            <p className="setup-hint">Device ID that will appear in your dashboard: <strong>{sentinelId}</strong></p>
            <button type="button" className="refresh-devices-button" onClick={loadProtectionData}>I installed it, check for my device</button>
          </div>

          <div className="card">
            <h2>Add computers and phones to protection</h2>
            <p className="section-intro">
              Run the sentinel on a machine that can observe your business network. Phones, laptops, and servers then
              show up through telemetry and event activity automatically.
            </p>
            <div className="onboarding-steps">
              <div className="onboarding-step">
                <strong>1. Set your API endpoint and key</strong>
                <p>Use your live API URL and key so each office or network segment can report data securely.</p>
              </div>
              <div className="onboarding-step">
                <strong>2. Start a sentinel per location</strong>
                <p>Install one sentinel on each site or VLAN to maintain continuous monitoring coverage.</p>
              </div>
              <div className="onboarding-step">
                <strong>3. Confirm live reporting below</strong>
                <p>When events start arriving, devices appear in the monitored assets table with status updates.</p>
              </div>
            </div>

            <div className="install-snippets">
              <div className="snippet-block">
                <div className="snippet-header">
                  <h3>Windows (PowerShell)</h3>
                  <div className="snippet-actions">
                    <button type="button" className="snippet-copy" onClick={() => copyText('Windows command', windowsCommand)}>Copy</button>
                    <button type="button" className="snippet-copy" onClick={() => downloadScript(windowsCommand, 'windows')}>Download</button>
                  </div>
                </div>
                <pre>{windowsCommand}</pre>
              </div>

              <div className="snippet-block">
                <div className="snippet-header">
                  <h3>Mac/Linux (Terminal)</h3>
                  <div className="snippet-actions">
                    <button type="button" className="snippet-copy" onClick={() => copyText('Mac/Linux command', macLinuxCommand)}>Copy</button>
                    <button type="button" className="snippet-copy" onClick={() => downloadScript(macLinuxCommand, 'maclinux')}>Download</button>
                  </div>
                </div>
                <pre>{macLinuxCommand}</pre>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Your monitored equipment</h2>
            <p className="section-intro">Use this view to confirm that every signal maps back to a known device and location.</p>
            {devices.length === 0 ? (
              <p className="empty-state">No assets are currently connected. Add or connect a device to see it here.</p>
            ) : (
              <table className="data-table">
                <caption className="table-caption">Current list of monitored assets and their latest status.</caption>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Area</th>
                    <th>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td>{device.id}</td>
                      <td>{device.type}</td>
                      <td>
                        <span className={`badge ${device.status === 'Online' ? 'status-online' : 'status-offline'}`}>
                          {device.status}
                        </span>
                      </td>
                      <td>{device.location}</td>
                      <td>{device.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

