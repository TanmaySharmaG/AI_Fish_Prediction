const FISH_ICONS = {
  "Yellowfin Tuna": "🐟", "Skipjack Tuna": "🐠", "Blue Marlin": "⚓",
  "Mahi-Mahi": "🐡", "Wahoo": "🦈"
};

async function predict() {
  const fields = ["chlorophyll", "sst", "ssh", "salinity"];
  const payload = {};

  for (const f of fields) {
    const val = document.getElementById(f).value.trim();
    if (!val) return alert(`Please enter a value for ${f}`);
    payload[f] = parseFloat(val);
  }
  payload.month = parseInt(document.getElementById("month").value);
  payload.location = document.getElementById("location").value;

  const btn = document.getElementById("predict-btn");
  const results = document.getElementById("results");
  const loader = document.getElementById("loader");
  const list = document.getElementById("fish-list");

  btn.disabled = true;
  results.style.display = "block";
  loader.style.display = "block";
  list.innerHTML = "";

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    loader.style.display = "none";

    if (data.error) {
      list.innerHTML = `<div class="error-msg">⚠ ${data.error}</div>`;
      return;
    }

    data.predictions.forEach((p, i) => {
      const icon = FISH_ICONS[p.fish] || "🐟";
      const isTop = i === 0;
      const div = document.createElement("div");
      div.className = "fish-item";
      div.innerHTML = `
        <div class="fish-header">
          <div>
            <span class="fish-rank">#${i + 1}</span>
            <span class="fish-name"> ${icon} ${p.fish}</span>
            ${isTop ? '<span class="top-badge">Best Match</span>' : ""}
          </div>
          <span class="fish-pct">${p.confidence}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill" data-w="${p.confidence}"></div></div>
      `;
      list.appendChild(div);
    });

    // Animate bars after DOM paint
    requestAnimationFrame(() => {
      document.querySelectorAll(".bar-fill").forEach(bar => {
        bar.style.width = bar.dataset.w + "%";
      });
    });

  } catch (err) {
    loader.style.display = "none";
    list.innerHTML = `<div class="error-msg">⚠ Connection error. Is Flask running?</div>`;
  } finally {
    btn.disabled = false;
  }
}
