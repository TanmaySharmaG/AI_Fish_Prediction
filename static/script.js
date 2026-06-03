const FISH_DATA = {
  "Anchovy":     { sci: "Engraulis encrasicolus",   market: "₹80–120/kg",   emoji: "🐟" },
  "Barracuda":   { sci: "Sphyraena barracuda",      market: "₹200–300/kg",  emoji: "🐠" },
  "Bombay Duck": { sci: "Harpadon nehereus",        market: "₹60–100/kg",   emoji: "🐡" },
  "Catfish":     { sci: "Silurus glanis",           market: "₹120–180/kg",  emoji: "🐟" },
  "Cod":         { sci: "Gadus morhua",             market: "₹350–500/kg",  emoji: "🐠" },
  "Croakers":    { sci: "Sciaenidae spp.",          market: "₹150–220/kg",  emoji: "🐡" },
  "Grouper":     { sci: "Epinephelus spp.",         market: "₹400–600/kg",  emoji: "🐟" },
  "Herring":     { sci: "Clupea harengus",          market: "₹90–140/kg",   emoji: "🐠" },
  "Hilsa":       { sci: "Tenualosa ilisha",         market: "₹500–1200/kg", emoji: "🐡" },
  "Kingfish":    { sci: "Scomberomorus cavalla",    market: "₹250–400/kg",  emoji: "🐟" },
  "Mackerel":    { sci: "Scomber scombrus",         market: "₹100–160/kg",  emoji: "🐠" },
  "Pomfret":     { sci: "Pampus argenteus",         market: "₹400–700/kg",  emoji: "🐡" },
  "Ribbonfish":  { sci: "Trichiurus lepturus",      market: "₹80–130/kg",   emoji: "🐟" },
  "Salmon":      { sci: "Salmo salar",              market: "₹600–900/kg",  emoji: "🐠" },
  "Sardine":     { sci: "Sardina pilchardus",       market: "₹50–90/kg",    emoji: "🐡" },
  "Seer Fish":   { sci: "Scomberomorus lineolatus", market: "₹300–500/kg",  emoji: "🐟" },
  "Shark":       { sci: "Carcharhinus spp.",        market: "₹180–280/kg",  emoji: "🦈" },
  "Snapper":     { sci: "Lutjanus spp.",            market: "₹200–350/kg",  emoji: "🐠" },
  "Tilapia":     { sci: "Oreochromis niloticus",    market: "₹120–180/kg",  emoji: "🐟" },
  "Tuna":        { sci: "Thunnus albacares",        market: "₹250–450/kg",  emoji: "🐠" }
};

const RULES = {
  chlorophyll: { min: 0.01, max: 5,   label: "Chlorophyll", unit: "mg/m³" },
  sst:         { min: 5,    max: 40,  label: "SST",         unit: "°C"    },
  ssh:         { min: -2,   max: 2,   label: "SSH",         unit: "m"     },
  salinity:    { min: 20,   max: 40,  label: "Salinity",    unit: "PSU"   }
};

const LOADER_STEPS = [
  "Initializing RandomForest model…",
  "Preprocessing ocean parameters…",
  "Running ensemble classifiers…",
  "Aggregating 100 decision trees…",
  "Computing confidence scores…",
  "Ranking species predictions…"
];

let toastTimer = null;

function showToast(title, msg) {
  const existing = document.getElementById("val-toast");
  if (existing) existing.remove();
  clearTimeout(toastTimer);

  const toast = document.createElement("div");
  toast.className = "toast-alert";
  toast.id = "val-toast";
  toast.innerHTML = `
    <div class="toast-icon">⚠</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" onclick="dismissToast()">✕</button>
  `;
  document.body.appendChild(toast);
  toastTimer = setTimeout(dismissToast, 5000);
}

function dismissToast() {
  const t = document.getElementById("val-toast");
  if (!t) return;
  t.classList.add("hide");
  setTimeout(() => t.remove(), 300);
}

function setFieldState(id, isValid, msg) {
  const input = document.getElementById(id);
  const errEl = document.getElementById("err-" + id);
  if (!input) return;

  input.classList.remove("invalid", "valid");
  if (isValid === true)  input.classList.add("valid");
  if (isValid === false) input.classList.add("invalid");

  if (errEl) {
    errEl.textContent = msg || "";
    errEl.classList.toggle("show", !!msg);
  }
}

function validateAll() {
  const errors = [];

  for (const [id, rule] of Object.entries(RULES)) {
    const raw = document.getElementById(id).value.trim();
    if (raw === "") {
      setFieldState(id, false, `Required field`);
      errors.push(`${rule.label} is required`);
      continue;
    }
    const val = parseFloat(raw);
    if (isNaN(val)) {
      setFieldState(id, false, `Must be a number`);
      errors.push(`${rule.label} must be a number`);
    } else if (val < rule.min || val > rule.max) {
      setFieldState(id, false, `Out of range: ${rule.min} – ${rule.max} ${rule.unit}`);
      errors.push(`${rule.label}: ${val} ${rule.unit} is outside valid range (${rule.min}–${rule.max})`);
    } else {
      setFieldState(id, true, "");
    }
  }

  return errors;
}

// Live validation on blur/input
Object.keys(RULES).forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("blur",  () => validateAll());
  el.addEventListener("input", () => {
    // Only clear error state while typing (re-validate on blur)
    const raw = el.value.trim();
    if (raw === "") { setFieldState(id, null, ""); return; }
    const val = parseFloat(raw);
    const rule = RULES[id];
    if (!isNaN(val) && val >= rule.min && val <= rule.max) setFieldState(id, true, "");
  });
});

async function predict() {
  const errors = validateAll();
  if (errors.length > 0) {
    showToast("VALIDATION ERROR", errors[0]);
    // Scroll to first invalid field
    const firstInvalid = document.querySelector("input.invalid");
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const payload = {
    chlorophyll: parseFloat(document.getElementById("chlorophyll").value),
    sst:         parseFloat(document.getElementById("sst").value),
    ssh:         parseFloat(document.getElementById("ssh").value),
    salinity:    parseFloat(document.getElementById("salinity").value),
    month:       parseInt(document.getElementById("month").value),
    location:    document.getElementById("location").value
  };

  const btn        = document.getElementById("predict-btn");
  const results    = document.getElementById("results");
  const loader     = document.getElementById("loader");
  const list       = document.getElementById("fish-list");
  const errWrap    = document.getElementById("error-msg");
  const statusEl   = document.getElementById("result-status");
  const metaEl     = document.getElementById("result-meta");
  const loaderStep = document.getElementById("loader-step");
  const loaderBar  = document.getElementById("loader-bar");

  btn.disabled = true;
  results.style.display = "block";
  results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  loader.style.display = "flex";
  list.innerHTML = "";
  errWrap.style.display = "none";
  statusEl.className = "panel-indicator active";
  statusEl.innerHTML = '<span class="ind-dot active"></span>PROCESSING';
  metaEl.textContent = "Analyzing oceanographic parameters…";

  let step = 0;
  loaderBar.style.width = "0%";
  const stepInterval = setInterval(() => {
    if (step < LOADER_STEPS.length) {
      loaderStep.textContent = LOADER_STEPS[step];
      loaderBar.style.width = ((step + 1) / LOADER_STEPS.length * 85) + "%";
      step++;
    }
  }, 300);

  try {
    const res  = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    clearInterval(stepInterval);
    loaderBar.style.width = "100%";
    await new Promise(r => setTimeout(r, 300));
    loader.style.display = "none";

    if (data.error) {
      errWrap.style.display = "flex";
      document.getElementById("error-text").textContent = data.error;
      statusEl.className = "panel-indicator";
      statusEl.innerHTML = '<span class="ind-dot"></span>ERROR';
      showToast("SERVER ERROR", data.error);
      return;
    }

    statusEl.className = "panel-indicator active";
    statusEl.innerHTML = '<span class="ind-dot active"></span>COMPLETE';
    metaEl.textContent = `${data.predictions.length} species ranked · Top: ${data.predictions[0].fish}`;

    data.predictions.forEach((p, i) => {
      const fd   = FISH_DATA[p.fish] || { sci: "Species spp.", market: "—", emoji: "🐟" };
      const isTop = i === 0;
      const div  = document.createElement("div");
      div.className = "fish-card" + (isTop ? " rank-1" : "");
      div.style.animationDelay = (i * 0.07) + "s";

      const imgSrc = `/static/images/${p.fish.toLowerCase().replace(/ /g, "_")}.jpg`;
      div.innerHTML = `
        <div class="fish-top">
          <div class="fish-rank-badge">${String(i + 1).padStart(2, "0")}</div>
          <div class="fish-img-wrap">
            <img src="${imgSrc}" alt="${p.fish}"
              onerror="this.style.display='none';this.parentElement.querySelector('.fish-emoji').style.display='block'">
            <span class="fish-emoji" style="display:none">${fd.emoji}</span>
          </div>
          <div class="fish-info">
            <div class="fish-name">${p.fish}</div>
            <div class="fish-sci">${fd.sci}</div>
          </div>
          <div class="fish-right">
            <div class="fish-pct">${p.confidence}%</div>
            <div class="fish-market">${fd.market}</div>
          </div>
        </div>
        <div class="fish-meta-row">
          ${isTop ? '<span class="best-badge"><span class="best-dot"></span>BEST MATCH</span>' : '<span></span>'}
          <div class="bar-track"><div class="bar-fill" data-w="${p.confidence}"></div></div>
        </div>
      `;
      list.appendChild(div);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll(".bar-fill").forEach(b => { b.style.width = b.dataset.w + "%"; });
    }));

  } catch (err) {
    clearInterval(stepInterval);
    loader.style.display = "none";
    errWrap.style.display = "flex";
    document.getElementById("error-text").textContent = "Connection error. Ensure Flask is running on port 5000.";
    statusEl.className = "panel-indicator";
    statusEl.innerHTML = '<span class="ind-dot"></span>OFFLINE';
  } finally {
    btn.disabled = false;
  }
}
