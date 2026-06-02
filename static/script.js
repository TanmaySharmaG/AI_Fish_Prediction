const FISH_ICONS = {
  "Anchovy": "🐟",
  "Barracuda": "🦈",
  "Bombay Duck": "🐠",
  "Catfish": "🐟",
  "Cod": "🐟",
  "Croakers": "🐠",
  "Grouper": "🐡",
  "Herring": "🐟",
  "Hilsa": "🐠",
  "Kingfish": "🦈",
  "Mackerel": "🐟",
  "Pomfret": "🐠",
  "Ribbonfish": "🐟",
  "Salmon": "🐟",
  "Sardine": "🐠",
  "Seer Fish": "🦈",
  "Shark": "🦈",
  "Snapper": "🐡",
  "Tilapia": "🐟",
  "Tuna": "🐟"
};

const FISH_INFO = {

  "Anchovy": {
    image: "/static/images/anchovy.jpg",
    scientific: "Engraulidae",
    market: "Medium"
  },

  "Barracuda": {
    image: "/static/images/barracuda.jpg",
    scientific: "Sphyraena",
    market: "High"
  },

  "Bombay Duck": {
    image: "/static/images/bombayduck.jpg",
    scientific: "Harpadon nehereus",
    market: "Medium"
  },

  "Catfish": {
    image: "/static/images/catfish.jpg",
    scientific: "Siluriformes",
    market: "High"
  },

  "Cod": {
    image: "/static/images/cod.jpg",
    scientific: "Gadus morhua",
    market: "High"
  },

  "Croakers": {
    image: "/static/images/croakers.jpg",
    scientific: "Sciaenidae",
    market: "Medium"
  },

  "Grouper": {
    image: "/static/images/grouper.jpg",
    scientific: "Epinephelinae",
    market: "Premium"
  },

  "Herring": {
    image: "/static/images/herring.jpg",
    scientific: "Clupea harengus",
    market: "Medium"
  },

  "Hilsa": {
    image: "/static/images/hilsa.jpg",
    scientific: "Tenualosa ilisha",
    market: "Premium"
  },

  "Kingfish": {
    image: "/static/images/kingfish.jpg",
    scientific: "Scomberomorus",
    market: "Premium"
  },

  "Mackerel": {
    image: "/static/images/mackerel.jpg",
    scientific: "Scomber scombrus",
    market: "High"
  },

  "Pomfret": {
    image: "/static/images/pomfret.jpg",
    scientific: "Pampus argenteus",
    market: "Premium"
  },

  "Ribbonfish": {
    image: "/static/images/ribbonfish.jpg",
    scientific: "Trichiurus lepturus",
    market: "Medium"
  },

  "Salmon": {
    image: "/static/images/salmon.jpg",
    scientific: "Salmo salar",
    market: "Premium"
  },

  "Sardine": {
    image: "/static/images/sardine.jpg",
    scientific: "Sardinella longiceps",
    market: "Medium"
  },

  "Seer Fish": {
    image: "/static/images/seerfish.jpg",
    scientific: "Scomberomorus commerson",
    market: "Premium"
  },

  "Shark": {
    image: "/static/images/shark.jpg",
    scientific: "Selachimorpha",
    market: "High"
  },

  "Snapper": {
    image: "/static/images/snapper.jpg",
    scientific: "Lutjanus campechanus",
    market: "High"
  },

  "Tilapia": {
    image: "/static/images/tilapia.jpg",
    scientific: "Oreochromis niloticus",
    market: "Medium"
  },

  "Tuna": {
    image: "/static/images/tuna.jpg",
    scientific: "Thunnus",
    market: "Premium"
  }

};

async function predict() {

  const fields = ["chlorophyll", "sst", "ssh", "salinity"];
  const payload = {};

  for (const f of fields) {
    const val = document.getElementById(f).value.trim();

    if (!val) {
      return alert(`Please enter ${f}`);
    }

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    loader.style.display = "none";

    if (data.error) {
      list.innerHTML = `
        <div class="error-msg">
          ⚠ ${data.error}
        </div>
      `;
      return;
    }

    data.predictions.forEach((p, i) => {

      const icon = FISH_ICONS[p.fish] || "🐟";

      const info = FISH_INFO[p.fish] || {};

      const isTop = i === 0;

      const div = document.createElement("div");

      div.className = "fish-item";

      div.innerHTML = `

        <div class="fish-card">

          <img 
            src="${info.image || '/static/images/default.jpg'}"
            class="fish-img"
          >

          <div class="fish-details">

            <div class="fish-header">

              <div>
                <span class="fish-rank">#${i + 1}</span>

                <span class="fish-name">
                  ${icon} ${p.fish}
                </span>

                ${isTop ? '<span class="top-badge">Best Match</span>' : ""}
              </div>

              <span class="fish-pct">
                ${p.confidence}%
              </span>

            </div>

            <div class="bar-track">
              <div 
                class="bar-fill"
                data-w="${p.confidence}">
              </div>
            </div>

            <div class="fish-meta">

              <p>
                <b>Scientific Name:</b>
                ${info.scientific || "Unknown"}
              </p>

              <p>
                <b>Market Value:</b>
                ${info.market || "Normal"}
              </p>

            </div>

          </div>

        </div>
      `;

      list.appendChild(div);

    });

    requestAnimationFrame(() => {

      document.querySelectorAll(".bar-fill").forEach(bar => {

        bar.style.width = bar.dataset.w + "%";

      });

    });

  } catch (err) {

    loader.style.display = "none";

    list.innerHTML = `
      <div class="error-msg">
        ⚠ Connection error
      </div>
    `;

  } finally {

    btn.disabled = false;

  }

}