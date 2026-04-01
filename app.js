const DEMO_USERS = {
  suhib: { password: 'admin123', name: 'Suhib', role: 'Admin' },
  fatema: { password: 'manager123', name: 'Fatema', role: 'Ops Manager' },
  abeer: { password: 'viewer123', name: 'Abeer', role: 'Viewer' },
};

const ROLE_PERMISSIONS = {
  'Admin': ['Request Builder', 'Cost Engine', 'Quotation', 'Rates', 'Users & Roles'],
  'Ops Manager': ['Request Builder', 'Cost Engine', 'Quotation'],
  'Viewer': ['Cost Engine', 'Quotation'],
};

const RATES = {
  Bahrain: { ec2: 0.211, haivision: 1.39, ebs: 0.0096, ip: 0.005, internet: 0.1105, regional: 0.01, label: 'Middle East (Bahrain)' },
  Paris: { ec2: 0.202, haivision: 1.39, ebs: 0.013, ip: 0.005, internet: 0.301, regional: 0.01, label: 'EU (Paris)' },
};

const ENCODER_DAILY_RATE = 25;

const state = {
  user: null,
  tab: 'Request Builder',
  form: {
    requestTitle: 'Saudi Distribution - Bahrain Gateway',
    clientName: 'VG',
    requesterName: '',
    projectName: '',
    gatewayRegion: 'Bahrain',
    destinationType: 'internet',
    bitrateKbps: 8000,
    codec: 'H.264',
    format: '1080p50',
    frameRate: '50',
    scanType: 'Progressive',
    chromaSampling: '4:2:0',
    bitDepth: '8-bit',
    audioCodec: 'AAC',
    audioBitrateKbps: 128,
    audioChannels: 'Stereo',
    incomingStreams: 1,
    outgoingDestinations: 10,
    hoursPerDay: 12,
    numberOfDays: 1,
    numberOfEncoders: 1,
    redundancy: 'Single Path',
    includeLabor: true,
    laborRate: 5.89,
    includeMargin: false,
    marginPct: 15,
    notes: '',
  },
};

const app = document.getElementById('app');

function loadSession() {
  const saved = localStorage.getItem('mcr_costing_session_v3');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.user) state.user = parsed.user;
      if (parsed.form) state.form = { ...state.form, ...parsed.form };
      if (parsed.tab) state.tab = parsed.tab;
    } catch {}
  }
}

function saveSession() {
  localStorage.setItem('mcr_costing_session_v3', JSON.stringify({ user: state.user, form: state.form, tab: state.tab }));
}

function calc() {
  const f = state.form;
  const region = RATES[f.gatewayRegion];
  const bitrateMbps = Number(f.bitrateKbps || 0) / 1000;
  const gbPerHourPerDestination = bitrateMbps * 0.43945;
  const outboundGbPerHour = gbPerHourPerDestination * Number(f.outgoingDestinations || 0);
  const inboundGbPerHour = gbPerHourPerDestination * Number(f.incomingStreams || 0);

  let internetGbPerHour = outboundGbPerHour;
  let regionalGbPerHour = 0;
  if (f.destinationType === 'regional') {
    internetGbPerHour = 0;
    regionalGbPerHour = outboundGbPerHour;
  } else if (f.destinationType === 'hybrid') {
    internetGbPerHour = outboundGbPerHour * 0.5;
    regionalGbPerHour = outboundGbPerHour * 0.5;
  }

  const fixedPerHour = region.ec2 + region.haivision + region.ebs + region.ip;
  const internetCostPerHour = internetGbPerHour * region.internet;
  const regionalCostPerHour = regionalGbPerHour * region.regional;
  const laborPerHour = f.includeLabor ? Number(f.laborRate || 0) : 0;
  const totalPerHour = fixedPerHour + internetCostPerHour + regionalCostPerHour + laborPerHour;

  const gatewayDailyCost = totalPerHour * Number(f.hoursPerDay || 0);
  const encoderDailyCost = Number(f.numberOfEncoders || 0) * ENCODER_DAILY_RATE;
  const dailyRate = gatewayDailyCost + encoderDailyCost;
  const subtotal = dailyRate * Number(f.numberOfDays || 0);
  const marginValue = f.includeMargin ? subtotal * (Number(f.marginPct || 0) / 100) : 0;
  const total = subtotal + marginValue;
  const totalOutboundGb = outboundGbPerHour * Number(f.hoursPerDay || 0) * Number(f.numberOfDays || 0);

  return {
    region,
    bitrateMbps,
    gbPerHourPerDestination,
    outboundGbPerHour,
    inboundGbPerHour,
    internetGbPerHour,
    regionalGbPerHour,
    fixedPerHour,
    internetCostPerHour,
    regionalCostPerHour,
    laborPerHour,
    totalPerHour,
    gatewayDailyCost,
    encoderDailyCost,
    dailyRate,
    subtotal,
    marginValue,
    total,
    totalOutboundGb,
  };
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s]));
}

function loginView() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-panel glass">
        <div class="logo-wrap logo-wrap-lg"><img src="logo.png" alt="Logo"></div>
        <h2>MCR Costing & Quotation System</h2>
        <p>Offline-ready version with professional gateway request logic, encoder costing, daily rate calculation, quotation view, and role-based access.</p>
        <div class="small-note" style="margin: 4px 0 18px;">Use your assigned credentials to sign in.</div>
        <div class="field-grid">
          <div class="field"><label>Username</label><input id="loginUser" class="input" autocomplete="username"></div>
          <div class="field"><label>Password</label><input id="loginPass" type="password" class="input" autocomplete="current-password"></div>
        </div>
        <div class="actions">
          <button class="primary login-button" id="loginBtn">Login</button>
        </div>
      </div>
    </div>`;
  document.getElementById('loginBtn').onclick = () => {
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value;
    if (DEMO_USERS[u] && DEMO_USERS[u].password === p) {
      state.user = { username: u, name: DEMO_USERS[u].name, role: DEMO_USERS[u].role };
      state.tab = ROLE_PERMISSIONS[state.user.role][0];
      saveSession();
      render();
    } else {
      alert('Invalid username or password.');
    }
  };
};

function sidebarHtml() {
  const perms = ROLE_PERMISSIONS[state.user.role];
  const tabs = ['Request Builder', 'Cost Engine', 'Quotation', 'Rates', 'Users & Roles'].filter(t => perms.includes(t));
  return `
    <div class="sidebar glass">
      <div class="user-card">
        <div class="tiny">Signed in as</div>
        <div class="name">${esc(state.user.name)}</div>
        <div class="badge">${esc(state.user.role)}</div>
      </div>
      <div class="nav">
        ${tabs.map(t => `<button class="${state.tab === t ? 'active':''}" data-tab="${esc(t)}">${esc(t)}</button>`).join('')}
        <button id="logoutBtn">Logout</button>
      </div>
    </div>`;
}

function headerHtml() {
  return `
    <div class="header glass">
      <div class="brand">
        <div class="logo-wrap logo-wrap-xl"><img src="logo.png" alt="Logo"></div>
        <div>
          <h1>MCR Costing & Quotation System</h1>
          <p>Advanced MCR request intake, daily rate logic, encoder daily pricing, auto-calculated regional bandwidth, and cleaner quotation output.</p>
        </div>
      </div>
    </div>`;
}

function statsPanel(c) {
  return `
    <div class="stats-panel card">
      <div class="stats-panel-grid">
        <div class="stat-tile"><div class="label">Gateway Region</div><div class="value">${esc(c.region.label)}</div></div>
        <div class="stat-tile"><div class="label">Live Total</div><div class="value">$${c.total.toFixed(2)}</div></div>
        <div class="stat-tile"><div class="label">Daily Rate</div><div class="value">$${c.dailyRate.toFixed(2)}</div></div>
        <div class="stat-tile"><div class="label">Project Duration</div><div class="value">${esc(state.form.numberOfDays)} day(s)</div></div>
      </div>
    </div>`;
}

function requestView(c) {
  const f = state.form;
  return `
  <div class="content glass">
    <div class="grid-2">
      <div class="card">
        <h2 class="section-title">Gateway Request Form</h2>
        <div class="field-grid">
          ${inputField('Request Title','requestTitle',f.requestTitle)}
          ${inputField('Client Name','clientName',f.clientName)}
          ${inputField('Requester Name','requesterName',f.requesterName)}
          ${inputField('Project / Event','projectName',f.projectName)}
          ${selectField('Gateway Region','gatewayRegion',f.gatewayRegion,['Bahrain','Paris'])}
          ${selectField('Destination Path Type','destinationType',f.destinationType,[['internet','Internet Delivery'],['regional','Regional / AWS Delivery'],['hybrid','Hybrid Split']])}
          ${numberField('Video Bitrate (kbps)','bitrateKbps',f.bitrateKbps)}
          ${selectField('Codec','codec',f.codec,['H.264','H.265','MPEG2','AVC-I'])}
          ${selectField('Video Format','format',f.format,['1080p50','1080i50','1080p59.94','720p50','2160p50'])}
          ${selectField('Frame Rate','frameRate',f.frameRate,['23.98','25','29.97','50','59.94','60'])}
          ${selectField('Scan Type','scanType',f.scanType,['Progressive','Interlaced'])}
          ${selectField('Chroma Sampling','chromaSampling',f.chromaSampling,['4:2:0','4:2:2','4:4:4'])}
          ${selectField('Bit Depth','bitDepth',f.bitDepth,['8-bit','10-bit','12-bit'])}
          ${selectField('Audio Codec','audioCodec',f.audioCodec,['AAC','MPEG-1 Layer II','PCM','Dolby E'])}
          ${numberField('Audio Bitrate (kbps)','audioBitrateKbps',f.audioBitrateKbps)}
          ${selectField('Audio Channels','audioChannels',f.audioChannels,['Mono','Stereo','5.1','8 Channel'])}
          ${numberField('Incoming Streams','incomingStreams',f.incomingStreams)}
          ${numberField('Outgoing Destinations','outgoingDestinations',f.outgoingDestinations)}
          ${numberField('Hours per Day','hoursPerDay',f.hoursPerDay)}
          ${numberField('Number of Days','numberOfDays',f.numberOfDays)}
          ${numberField('Number of Encoders','numberOfEncoders',f.numberOfEncoders)}
          ${selectField('Redundancy Mode','redundancy',f.redundancy,['Single Path','Primary + Backup','Dual Active'])}
          <div class="field full card subtle-card">
            <div class="check-row"><input type="checkbox" data-check="includeLabor" ${f.includeLabor ? 'checked':''}><label>Include Labor Cost ($${Number(f.laborRate).toFixed(2)}/hr)</label></div>
            <div class="check-row"><input type="checkbox" data-check="includeMargin" ${f.includeMargin ? 'checked':''}><label>Include Quotation Margin</label></div>
            <div class="field-grid" style="margin-top:12px;">
              ${numberField('Labor Rate / Hour','laborRate',f.laborRate)}
              ${numberField('Margin %','marginPct',f.marginPct)}
            </div>
          </div>
          <div class="field full"><label>Technical Notes / Special Routing</label><textarea class="textarea" data-field="notes">${esc(f.notes)}</textarea></div>
        </div>
      </div>
      <div>
        <div class="kpi-grid">
          ${kpi('Video Bitrate', `${c.bitrateMbps.toFixed(2)} Mbps`)}
          ${kpi('Hours / Day', `${f.hoursPerDay} hrs`)}
          ${kpi('Number of Days', `${f.numberOfDays}`)}
          ${kpi('Outbound Data', `${c.totalOutboundGb.toFixed(2)} GB`)}
        </div>
        ${statsPanel(c)}
        <div class="card">
          <h2 class="section-title">Current Cost Logic</h2>
          <div class="info-grid">
            ${info('Region', c.region.label)}
            ${info('Bitrate', `${f.bitrateKbps} kbps`)}
            ${info('Destinations', `${f.outgoingDestinations}`)}
            ${info('Hours / Day', `${f.hoursPerDay}`)}
            ${info('Days', `${f.numberOfDays}`)}
            ${info('Path', f.destinationType === 'internet' ? 'Internet Delivery' : f.destinationType === 'regional' ? 'Regional / AWS Delivery' : 'Hybrid Split')}
          </div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Metric</th><th>Logic</th><th>Result</th></tr></thead><tbody>
            ${row('Formula','Fixed + Internet Transfer + Regional Transfer + Optional Labor + Encoder Daily Cost','Live model')}
            ${row('GB / hour / destination',`${c.bitrateMbps.toFixed(2)} × 0.43945`,`${c.gbPerHourPerDestination.toFixed(4)} GB`)}
            ${row('Inbound GB / hour',`${c.gbPerHourPerDestination.toFixed(4)} × ${f.incomingStreams}`,`${c.inboundGbPerHour.toFixed(4)} GB`)}
            ${row('Total outbound GB / hour',`${c.gbPerHourPerDestination.toFixed(4)} × ${f.outgoingDestinations}`,`${c.outboundGbPerHour.toFixed(4)} GB`)}
            ${row('Internet GB / hour','Auto from destination path',`${c.internetGbPerHour.toFixed(4)} GB`)}
            ${row('Regional GB / hour','Auto-calculated from bitrate and path',`${c.regionalGbPerHour.toFixed(4)} GB`)}
            ${row('Encoder daily cost',`${f.numberOfEncoders} × $${ENCODER_DAILY_RATE}`,`$${c.encoderDailyCost.toFixed(2)}`)}
            ${row('Gateway cost / day',`$${c.totalPerHour.toFixed(4)} × ${f.hoursPerDay}`,`$${c.gatewayDailyCost.toFixed(2)}`)}
            ${row('Daily rate',`Gateway daily + encoder daily`,`$${c.dailyRate.toFixed(2)}`)}
            ${row('Project subtotal',`$${c.dailyRate.toFixed(2)} × ${f.numberOfDays}`,`$${c.subtotal.toFixed(2)}`)}
            ${row('Quotation total',f.includeMargin ? `Subtotal + ${f.marginPct}% margin` : 'Subtotal only',`$${c.total.toFixed(2)}`)}
          </tbody></table></div>
        </div>
      </div>
    </div>
  </div>`;
}

function costView(c) {
  return `
  <div class="content glass">
    <div class="kpi-grid">
      ${kpi('Fixed Cost / Hour', `$${c.fixedPerHour.toFixed(4)}`)}
      ${kpi('Internet Cost / Hour', `$${c.internetCostPerHour.toFixed(4)}`)}
      ${kpi('Labor / Hour', `$${c.laborPerHour.toFixed(2)}`)}
      ${kpi('Daily Rate', `$${c.dailyRate.toFixed(2)}`)}
    </div>
    ${statsPanel(c)}
    <div class="card table-wrap">
      <h2 class="section-title">Cost Breakdown</h2>
      <table class="table"><thead><tr><th>Cost Component</th><th>Formula</th><th>Value</th></tr></thead><tbody>
        ${row('EC2 Rate','Region EC2 rate',`$${c.region.ec2.toFixed(4)}/hr`)}
        ${row('Haivision Rate','Marketplace license',`$${c.region.haivision.toFixed(2)}/hr`)}
        ${row('EBS Rate','Storage allocation',`$${c.region.ebs.toFixed(4)}/hr`)}
        ${row('Public IP','IPv4 allocation',`$${c.region.ip.toFixed(4)}/hr`)}
        ${row('Bandwidth / destination',`${c.bitrateMbps.toFixed(2)} × 0.43945`,`${c.gbPerHourPerDestination.toFixed(4)} GB/hr`)}
        ${row('Internet transfer',`${c.internetGbPerHour.toFixed(4)} × ${c.region.internet}`,`$${c.internetCostPerHour.toFixed(4)}/hr`)}
        ${row('Regional transfer',`${c.regionalGbPerHour.toFixed(4)} × ${c.region.regional}`,`$${c.regionalCostPerHour.toFixed(4)}/hr`)}
        ${row('Labor',state.form.includeLabor ? `${state.form.laborRate} × 1` : 'Excluded',`$${c.laborPerHour.toFixed(2)}/hr`)}
        ${row('Gateway running cost / day',`$${c.totalPerHour.toFixed(4)} × ${state.form.hoursPerDay}`,`$${c.gatewayDailyCost.toFixed(2)}`)}
        ${row('Encoder daily cost',`${state.form.numberOfEncoders} × $${ENCODER_DAILY_RATE}`,`$${c.encoderDailyCost.toFixed(2)}`)}
        ${row('Daily Rate',`Gateway daily + encoder daily`,`$${c.dailyRate.toFixed(2)}`)}
        ${row('Project Total',`$${c.dailyRate.toFixed(2)} × ${state.form.numberOfDays}`,`$${c.subtotal.toFixed(2)}`)}
        ${row('Final Quotation Total',state.form.includeMargin ? `Project total + ${state.form.marginPct}% margin` : 'Project total only',`$${c.total.toFixed(2)}`)}
      </tbody></table>
    </div>
  </div>`;
}

function quotationView(c) {
  const f = state.form;
  return `
  <div class="content glass">
    <div id="quotationExportRoot" class="quotation-export-root">
      <div class="quote-hero">
        <div>
          <h2 class="section-title" style="margin-bottom:8px;">Quotation View</h2>
          <div class="muted">Professional summary for internal approval and client-facing quotation draft.</div>
        </div>
        <div class="quote-total">
          <div class="tiny">Estimated Total</div>
          <div class="big">$${c.total.toFixed(2)}</div>
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:16px;">
        ${summary('Request', f.requestTitle || '-')}
        ${summary('Client', f.clientName || '-')}
        ${summary('Region', c.region.label)}
        ${summary('Duration', `${f.hoursPerDay} hrs/day × ${f.numberOfDays} day(s)`)}
      </div>
      <div class="spec-grid">
        ${spec('Video Spec', [`${f.codec} / ${f.format}`, `${f.frameRate} fps / ${f.scanType}`, `${f.chromaSampling} / ${f.bitDepth}`])}
        ${spec('Audio Spec', [`${f.audioCodec} / ${f.audioBitrateKbps} kbps`, `${f.audioChannels}`, `${f.incomingStreams} input(s)`])}
        ${spec('Distribution', [`${f.outgoingDestinations} destination(s)`, f.destinationType === 'internet' ? 'Internet Delivery' : f.destinationType === 'regional' ? 'Regional / AWS Delivery' : 'Hybrid Split', `${c.totalOutboundGb.toFixed(2)} GB total outbound`])}
      </div>
      <div class="quote-stats">
        <div class="quote-stat"><div class="label">Per Hour</div><div class="value">$${c.totalPerHour.toFixed(4)}</div></div>
        <div class="quote-stat"><div class="label">Encoder Daily</div><div class="value">$${c.encoderDailyCost.toFixed(2)}</div></div>
        <div class="quote-stat"><div class="label">Daily Rate</div><div class="value">$${c.dailyRate.toFixed(2)}</div></div>
        <div class="quote-stat"><div class="label">Project Total</div><div class="value">$${c.subtotal.toFixed(2)}</div></div>
      </div>
      <div class="quote-logic">
        <div class="muted">Quotation logic</div>
        <div class="formula">Daily Rate $${c.dailyRate.toFixed(2)} × ${f.numberOfDays} day(s)${f.includeMargin ? ` + ${f.marginPct}% margin` : ''}</div>
        <div style="margin-top:12px; line-height:1.7; color:#dceefa;">This quotation is based on ${c.region.label} gateway operation with ${f.incomingStreams} incoming stream(s), ${f.outgoingDestinations} outgoing destination(s), ${f.bitrateKbps} kbps video bitrate, ${f.codec} codec, ${f.format}, ${f.frameRate} fps, ${f.scanType.toLowerCase()} scan, ${f.audioCodec} audio, and ${f.numberOfEncoders} encoder(s) at $${ENCODER_DAILY_RATE} per encoder per day. Labor is ${f.includeLabor ? `included at $${Number(f.laborRate).toFixed(2)}/hr` : 'excluded'}.</div>
      </div>
      ${f.notes ? `<div class="card" style="margin-top:16px;"><div class="muted">Notes</div><div style="margin-top:10px;white-space:pre-wrap;line-height:1.7;">${esc(f.notes)}</div></div>` : ''}
    </div>
    <div class="actions">
      <button class="primary" id="downloadQuoteBtn">Download Quotation HTML</button>
      <button class="secondary" id="saveDraftBtn">Save Draft</button>
      <button class="secondary" id="printBtn">Print / Save PDF</button>
    </div>
  </div>`;
}

function ratesView() {
  const rows = Object.entries(RATES).map(([name, r]) => `
    <tr>
      <td>${name}</td><td>$${r.ec2.toFixed(4)}</td><td>$${r.haivision.toFixed(2)}</td><td>$${r.ebs.toFixed(4)}</td><td>$${r.ip.toFixed(4)}</td><td>$${r.internet.toFixed(4)}</td><td>$${r.regional.toFixed(4)}</td>
    </tr>`).join('');
  return `
  <div class="content glass">
    <div class="card table-wrap">
      <h2 class="section-title">Rates</h2>
      <table class="table"><thead><tr><th>Region</th><th>EC2 / hr</th><th>Haivision / hr</th><th>EBS / hr</th><th>IP / hr</th><th>Internet / GB</th><th>Regional / GB</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="neutral-note" style="margin-top:16px;">In a production version, Admin should be able to edit these values and save them to a database or config file.</div>
    </div>
  </div>`;
}

function usersView() {
  const rows = Object.values(DEMO_USERS).map(u => `
    <tr>
      <td>${u.name}</td><td>${u.role}</td><td><span class="badge" style="margin-top:0;">Active</span></td><td class="user-table-actions"><button class="secondary">Edit</button><button class="secondary">Permissions</button></td>
    </tr>`).join('');
  const roleCards = Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => `
    <div class="card">
      <h3 style="margin:0;">${role}</h3>
      <div class="role-pills">${perms.map(p => `<span class="pill">${p}</span>`).join('')}</div>
    </div>`).join('');
  return `
  <div class="content glass">
    <div class="grid-2">
      <div>
        <h2 class="section-title">Role Matrix</h2>
        <div class="grid-3">${roleCards}</div>
      </div>
      <div class="card table-wrap">
        <h2 class="section-title">Users</h2>
        <table class="table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="neutral-note" style="margin-top:16px;">Production version should enforce role permissions in backend APIs too, not only in the UI.</div>
      </div>
    </div>
  </div>`;
}

function inputField(label, key, value) {
  return `<div class="field"><label>${label}</label><input class="input" data-field="${key}" value="${esc(value)}"></div>`;
}
function numberField(label, key, value) {
  return `<div class="field"><label>${label}</label><input type="number" class="input" data-number="${key}" value="${esc(value)}"></div>`;
}
function selectField(label, key, value, options) {
  const opts = options.map(opt => {
    const val = Array.isArray(opt) ? opt[0] : opt;
    const txt = Array.isArray(opt) ? opt[1] : opt;
    return `<option value="${esc(val)}" ${val === value ? 'selected':''}>${esc(txt)}</option>`;
  }).join('');
  return `<div class="field"><label>${label}</label><select class="select" data-select="${key}">${opts}</select></div>`;
}
function kpi(label, value) { return `<div class="kpi"><div class="k-label">${label}</div><div class="k-value">${value}</div></div>`; }
function info(title, value) { return `<div class="info-box"><div class="t">${title}</div><div class="v">${value}</div></div>`; }
function row(a,b,c){ return `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`; }
function summary(label, value){ return `<div class="card"><div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${label}</div><div style="margin-top:10px;font-weight:700;line-height:1.6;">${value}</div></div>`; }
function spec(title, lines){ return `<div class="spec-card"><h4>${title}</h4>${lines.map(l=>`<div>${l}</div>`).join('')}</div>`; }

function getQuotationDocument(c) {
  const exportRoot = document.getElementById('quotationExportRoot');
  const quoteMarkup = exportRoot ? exportRoot.outerHTML : '<div>Quotation unavailable</div>';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MCR Quotation</title>
<style>${QUOTATION_EXPORT_CSS}</style>
</head>
<body>
  <div class="quotation-page">
    <div class="quotation-shell">
      <div class="quotation-brand">
        <img src="logo.png" alt="Logo">
        <div>
          <div class="quotation-brand-title">MCR Costing & Quotation System</div>
          <div class="quotation-brand-sub">${esc(c.region.label)} Gateway Quotation</div>
        </div>
      </div>
      ${quoteMarkup}
    </div>
  </div>
</body>
</html>`;
}

const QUOTATION_EXPORT_CSS = `
body{margin:0;font-family:Inter,Arial,sans-serif;background:#071224;color:#ecf7ff;padding:24px}
.quotation-page{max-width:1200px;margin:0 auto}
.quotation-shell{background:rgba(18,30,58,.96);border:1px solid rgba(70,198,255,.18);border-radius:28px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.quotation-brand{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.quotation-brand img{width:70px;height:70px;border-radius:18px;background:rgba(255,255,255,.03);padding:10px}
.quotation-brand-title{font-size:32px;font-weight:800;color:#eef7ff}
.quotation-brand-sub{margin-top:4px;color:#8fa8bc}
.quotation-export-root{color:#eef7ff}
.h2,.section-title{font-size:28px;font-weight:800;margin:0 0 12px}
.muted{color:#8fa8bc}.grid-4,.spec-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:16px}.spec-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.card,.spec-card,.quote-logic,.quote-stat{border-radius:22px;padding:18px;background:rgba(4,10,23,.55);border:1px solid rgba(255,255,255,.08)}
.quote-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}.quote-total{text-align:right}.quote-total .tiny{color:#8fa8bc;text-transform:uppercase;letter-spacing:.12em;font-size:12px}.quote-total .big{font-size:46px;font-weight:900;margin-top:8px}
.spec-card h4{margin:0 0 12px;font-size:16px;color:#b6f6ff}.spec-card div{margin-top:8px;color:#dceefa}
.quote-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;overflow:hidden;border-radius:24px;background:rgba(255,255,255,.08);margin-top:16px}
.quote-stat .label{color:#8fa8bc;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.quote-stat .value{font-size:30px;font-weight:800;margin-top:8px}.quote-logic{margin-top:16px;background:rgba(50,227,255,.06);border-color:rgba(50,227,255,.18)}.quote-logic .formula{margin-top:10px;font-size:20px;font-weight:700}
@media print{body{background:#fff;color:#111;padding:0}.quotation-shell{box-shadow:none;background:#fff;color:#111;border:1px solid #ddd}.quotation-brand-title,.quotation-export-root,.spec-card div{color:#111}.muted,.quotation-brand-sub,.quote-total .tiny,.quote-stat .label{color:#555}.card,.spec-card,.quote-logic,.quote-stat{background:#fff;border:1px solid #ddd}.quote-stats{background:#ddd}}
`;

function bindCommonEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => { state.tab = btn.dataset.tab; saveSession(); render(); });
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = () => { state.user = null; saveSession(); render(); };

  document.querySelectorAll('[data-field]').forEach(el => {
    const key = el.dataset.field;
    el.addEventListener('input', e => { state.form[key] = e.target.value; saveSession(); });
    el.addEventListener('change', () => render());
  });
  document.querySelectorAll('[data-number]').forEach(el => {
    const key = el.dataset.number;
    el.addEventListener('input', e => {
      const v = e.target.value;
      state.form[key] = v === '' ? '' : Number(v);
      saveSession();
    });
    el.addEventListener('change', () => render());
  });
  document.querySelectorAll('[data-select]').forEach(el => {
    const key = el.dataset.select;
    el.addEventListener('change', e => { state.form[key] = e.target.value; saveSession(); render(); });
  });
  document.querySelectorAll('[data-check]').forEach(el => {
    const key = el.dataset.check;
    el.addEventListener('change', e => { state.form[key] = e.target.checked; saveSession(); render(); });
  });

  const printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.onclick = () => {
    const c = calc();
    const html = getQuotationDocument(c);
    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const saveDraftBtn = document.getElementById('saveDraftBtn');
  if (saveDraftBtn) saveDraftBtn.onclick = () => { saveSession(); alert('Draft saved locally in your browser.'); };

  const downloadQuoteBtn = document.getElementById('downloadQuoteBtn');
  if (downloadQuoteBtn) {
    downloadQuoteBtn.onclick = () => {
      const c = calc();
      const html = getQuotationDocument(c);
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mcr-quotation.html';
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }
}

function render() {
  if (!state.user) return loginView();
  const c = calc();
  let view = '';
  if (state.tab === 'Request Builder') view = requestView(c);
  else if (state.tab === 'Cost Engine') view = costView(c);
  else if (state.tab === 'Quotation') view = quotationView(c);
  else if (state.tab === 'Rates') view = ratesView();
  else if (state.tab === 'Users & Roles') view = usersView();

  app.innerHTML = `${headerHtml()}<div class="main">${sidebarHtml()}${view}</div>`;
  bindCommonEvents();
}

loadSession();
render();
