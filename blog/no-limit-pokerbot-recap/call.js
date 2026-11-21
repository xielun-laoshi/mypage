/* Call or fold? A bet after the flop, a hand, and two answers to "how often
   is this hand ahead": the one durrrr's model gave, and the one the field's
   bets gave, from the hands shown down when they were called. It keeps the
   contract a post's demo keeps with the page (js/blog.js): it fills its
   stage, draws only on a change (nothing moves on its own), takes its
   colors from the page's ink, and lets go of its listeners when put away. */

// A hand's strength: the share of random two-card hands it beats (0 to 1).
// The bins it is counted in, and what bettors held in them, by street and
// bet size: the share (%) of the hands shown down after such a bet that fell
// in each bin. s: up to 0.4 of the pot; m: 0.4 to 0.8; l: 0.8 to 1.3;
// a: an all-in of 0.8 to 1.3 of the pot.
const EDGES = [0, 0.4, 0.6, 0.8, 0.92, 0.97, 1];
const BINS = ["under 40%", "40-60%", "60-80%", "80-92%", "92-97%", "97% or more"];
const SHOWN = {
  flop: {
    s: [14.2, 23.7, 20.9, 21.8, 12.8, 6.5], m: [6.1, 10.5, 11.3, 24.4, 25.6, 22.2],
    l: [4.6, 6.8, 7.5, 18.7, 22.3, 40.0], a: [3.2, 6.6, 7.7, 19.4, 29.4, 33.7],
  },
  turn: {
    s: [13.0, 16.2, 24.3, 29.0, 9.2, 8.4], m: [4.9, 7.2, 15.7, 35.3, 17.8, 19.1],
    l: [2.5, 3.5, 9.3, 27.7, 22.6, 34.4], a: [1.2, 2.3, 7.9, 31.2, 23.0, 34.3],
  },
  river: {
    s: [13.2, 15.1, 29.1, 27.3, 8.3, 7.0], m: [4.1, 6.8, 22.5, 34.9, 17.2, 14.5],
    l: [2.4, 3.1, 13.7, 31.7, 25.1, 24.0], a: [1.1, 1.9, 12.9, 34.3, 24.8, 25.0],
  },
};

// durrrr's own answers to those bets, by bin: [the share of them it called
// (%), what a call won in chips (big blinds, against folding), the share of
// its calls' showdowns it won (%)]. null: too few to say.
const CALLS = {
  flop: {
    s: [[30, 2.8, 38], [56, 3.4, 45], [78, 1.4, 51], [98, 2.1, 50], [94, 10.5, 59], [7, 18.9, 63]],
    m: [[16, 2.4, 44], [36, -0.3, 42], [60, -4.1, 38], [93, -7.7, 33], [94, 1.4, 47], [8, 11.7, 58]],
    l: [[7, 0.8, 43], [22, -5.2, 35], [44, -11.4, 27], [88, -18.4, 23], [93, -11.9, 35], [7, 11.0, 58]],
    a: [[15, 6.1, 46], [33, 4.8, 37], [37, -7.7, 23], [80, -5.9, 26], [100, 5.2, 41], [99, 28.2, 69]],
  },
  turn: {
    s: [[47, 2.8, 38], [64, 1.1, 35], [84, 1.7, 41], [99, 6.9, 54], [96, 21.2, 73], [11, 33.5, 73]],
    m: [[17, 2.0, 44], [35, -3.3, 34], [69, -8.0, 27], [96, -3.9, 39], [97, 14.3, 59], [11, 29.4, 71]],
    l: [[5, -3.3, 33], [18, -9.1, 33], [57, -19.7, 19], [93, -19.9, 27], [98, 1.0, 47], [10, 15.8, 60]],
    a: [[14, -4.4, 23], [27, -10.9, 16], [61, -14.0, 12], [93, -11.1, 23], [100, 10.3, 47], [99, 45.6, 80]],
  },
  river: {
    s: [[16, -1.0, 12], [46, 1.1, 24], [82, 7.8, 41], [99, 20.0, 68], [94, 33.8, 85], [10, 38.3, 94]],
    m: [[0, -4.0, 22], [15, -7.7, 15], [63, -5.6, 22], [95, 7.4, 45], [96, 29.1, 73], [13, 39.5, 86]],
    l: [[0, 0, 0], [3, -18.9, 6], [48, -19.4, 11], [90, -7.8, 30], [98, 14.3, 57], null],
    a: [[2, -5.0, 0], [15, -17.8, 3], [66, -23.0, 9], [95, -8.8, 28], [100, 32.3, 60], [100, 66.4, 90]],
  },
};

const STREETS = { flop: "Flop", turn: "Turn", river: "River" };
const SIZES = { s: ["1/3 pot", 1 / 3], m: ["2/3 pot", 2 / 3], l: ["Pot", 1], a: ["All-in, pot", 1] };

// durrrr's model of a bettor it has not seen yet (agent.py, equity_against_bet):
// the bluffs are the share a balanced bettor would use at this price, a little
// more before the river; the rest is value, at most 45% of the bettor's hands.
const EXTRA = { flop: 0.1, turn: 0.05, river: 0 };
const AGGRESSION = 0.45;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function model(strength, street, size) {
  const bet = SIZES[size][1];
  const price = bet / (1 + 2 * bet);                       // its share of the final pot
  let bluffs = Math.min(0.6, price + EXTRA[street]);
  let value = AGGRESSION * (1 - bluffs);
  if (value > 0.45) { value = 0.45; bluffs = 1 - value / AGGRESSION; }
  const weaker = 1 - value;
  const ahead = bluffs * Math.min(1, strength / weaker) + (1 - bluffs) * clamp((strength - weaker) / value, 0, 1);
  // Before the river the bettor may still draw out, 10% a card; an all-in
  // sees every card still to come, and is called on equity alone.
  const allIn = size === "a";
  const cards = street === "river" ? 0 : street === "flop" ? (allIn ? 2 : 1.5) : 1;
  const equity = ahead * 0.9 ** cards;
  const calls = allIn ? equity >= price + 0.03 : equity * 0.95 >= price + 0.02;
  return { price, ahead, calls };
}

/** The share of the field's betting hands that a hand of this strength beats. */
function field(strength, street, size) {
  const shares = SHOWN[street][size];
  const total = shares.reduce((sum, share) => sum + share, 0);
  let beaten = 0;
  for (let i = 0; i < shares.length; i++) {
    const lo = EDGES[i], hi = EDGES[i + 1];
    if (strength >= hi) beaten += shares[i];
    else {
      if (strength > lo) beaten += (shares[i] * (strength - lo)) / (hi - lo);
      break;
    }
  }
  return beaten / total;
}

const pct = (x) => `${Math.round(100 * x)}%`;

export default function mount(stage, demo) {
  stage.innerHTML = `
    <style>
      .cf { --cf-grid: color-mix(in srgb, var(--ink) 15%, var(--bg)); container-type: inline-size; }
      .cf-pick { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0 0.4em; }
      .cf-pick > span { margin-right: 0.6em; color: var(--ink-2); }
      .cf-pick button[aria-pressed="false"] { color: var(--ink-2); }
      .cf-pick button[aria-pressed="true"] { color: var(--ink); }
      .cf-bars { display: grid; grid-template-columns: max-content minmax(6em, 1fr) max-content; align-items: center; gap: 1em 1.2em; margin-top: 1.8em; }
      .cf-name { color: var(--ink-2); }
      .cf-track { position: relative; height: 0.9em; background: var(--cf-grid); }
      .cf-fill { position: absolute; inset: 0 auto 0 0; border-radius: 0 4px 4px 0; }
      .cf-fill.is-model { background: var(--ink-2); }
      .cf-fill.is-field { background: var(--ink); }
      .cf-price { position: absolute; top: -0.45em; bottom: -0.45em; border-left: 2px solid var(--ink); box-shadow: 0 0 0 1px var(--bg); }
      .cf-num { text-align: right; font-variant-numeric: tabular-nums; }
      .cf-axis { grid-column: 2; position: relative; height: 1.3em; color: var(--ink-2); }
      .cf-axis > span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
      .cf-lines { margin-top: 1.4em; }
      .cf-lines p { margin: 0.35em 0 0; }
      .cf-lines .cf-quiet { color: var(--ink-2); }
      /* (Narrow, as on a phone: each bar under its own name, and fewer ticks.) */
      @container (max-width: 520px) {
        .cf-bars { grid-template-columns: minmax(0, 1fr) max-content; gap: 0.3em 1em; }
        .cf-name { grid-column: 1 / -1; margin-top: 0.5em; }
        .cf-axis { grid-column: 1; }
        .cf-axis > span:nth-child(even) { display: none; }
      }
    </style>
    <div class="cf">
      <div class="demo-controls">
        <div class="cf-pick" role="group" aria-label="Street"><span>Street</span></div>
        <div class="cf-pick" role="group" aria-label="Bet size"><span>Bet</span></div>
        <label>Hand beats <span class="cf-strength">70%</span>
          <input type="range" name="strength" min="40" max="99" step="1" value="70" aria-label="Share of random hands the hand beats" />
        </label>
      </div>
      <div class="cf-bars">
        <span class="cf-name">durrrr's model</span>
        <span class="cf-track"><span class="cf-fill is-model"></span><span class="cf-price"></span></span>
        <span class="cf-num" data-out="model"></span>
        <span class="cf-name">The field's bets</span>
        <span class="cf-track"><span class="cf-fill is-field"></span><span class="cf-price"></span></span>
        <span class="cf-num" data-out="field"></span>
        <span class="cf-axis" aria-hidden="true"></span>
      </div>
      <div class="cf-lines" aria-live="polite">
        <p data-out="price"></p>
        <p data-out="verdict"></p>
        <p class="cf-quiet" data-out="receipt"></p>
      </div>
    </div>`;

  const state = { street: "river", size: "m", strength: 0.7 };
  const [streets, sizes] = stage.querySelectorAll(".cf-pick");
  const slider = stage.querySelector('[name="strength"]');
  const out = (name) => stage.querySelector(`[data-out="${name}"]`);
  const { signal } = demo;

  const buttons = [];
  for (const [group, key, choices] of [[streets, "street", STREETS], [sizes, "size", SIZES]]) {
    for (const [id, label] of Object.entries(choices)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = Array.isArray(label) ? label[0] : label;
      button.addEventListener("click", () => { state[key] = id; render(); }, { signal });
      group.append(button);
      buttons.push([button, key, id]);
    }
  }
  slider.addEventListener("input", () => { state.strength = Number(slider.value) / 100; render(); }, { signal });

  const axis = stage.querySelector(".cf-axis");
  axis.innerHTML = [0, 25, 50, 75, 100].map((x) => `<span style="left:${x}%">${x}%</span>`).join("");

  function render() {
    const { street, size, strength } = state;
    for (const [button, key, id] of buttons) button.setAttribute("aria-pressed", String(state[key] === id));
    stage.querySelector(".cf-strength").textContent = pct(strength);
    const m = model(strength, street, size);
    const f = field(strength, street, size);
    stage.querySelector(".is-model").style.width = `${100 * m.ahead}%`;
    stage.querySelector(".is-field").style.width = `${100 * f}%`;
    for (const tick of stage.querySelectorAll(".cf-price")) tick.style.left = `${100 * m.price}%`;
    out("model").textContent = `ahead ${pct(m.ahead)}`;
    out("field").textContent = `ahead ${pct(f)}`;

    const bet = SIZES[size][1];
    out("price").textContent = `The line is the price: a call risks ${bet === 1 ? "the pot" : SIZES[size][0].replace(" pot", " of the pot")} to win the pot and the bet, so it pays only if the hand is ahead more than ${pct(m.price)} of the time.`;
    const verdict = m.calls ? "durrrr's model calls." : "durrrr's model folds.";
    if (street === "river") {
      const ev = f * (1 + bet) - (1 - f) * bet;
      out("verdict").textContent = `${verdict} Against what the field bet, a call here ${ev >= 0 ? "wins" : "loses"} ${Math.abs(ev).toFixed(2)} of the pot each time.`;
    } else {
      out("verdict").textContent = `${verdict} Before the river, being ahead now is only part of it: more cards and more bets are to come.`;
    }
    const bin = EDGES.findIndex((edge, i) => strength >= edge && strength < EDGES[i + 1]);
    const row = CALLS[street][size][bin];
    out("receipt").textContent = row && row[0] > 0
      ? `durrrr's own calls with hands that beat ${BINS[bin]}: it called ${row[0]}% of these bets, won ${row[2]}% of the showdowns that followed, and ${row[1] < 0 ? "lost" : "won"} ${Math.abs(row[1]).toFixed(1)} big blinds a call against folding.`
      : `durrrr almost never called these bets with hands that beat ${BINS[bin]}.`;
  }

  demo.watch(render);
  render();
}
