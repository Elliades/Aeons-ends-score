const state = {
  players: [
    { id: "p1", name: "Player 1", life: 10 },
    { id: "p2", name: "Player 2", life: 10 },
  ],
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function renderPlayers() {
  const root = document.getElementById("players");
  if (!root) return;

  root.replaceChildren(
    ...state.players.map((p) => {
      const card = document.createElement("article");
      card.className = "player-card";
      card.dataset.playerId = p.id;

      const name = document.createElement("p");
      name.className = "player-name";
      name.textContent = p.name;

      const controls = document.createElement("div");
      controls.className = "life-controls";

      const dec = document.createElement("button");
      dec.className = "life-btn";
      dec.type = "button";
      dec.textContent = "-";
      dec.setAttribute("aria-label", `Decrease life for ${p.name}`);
      dec.dataset.delta = "-1";

      const value = document.createElement("div");
      value.className = "life-value";
      value.textContent = String(p.life);
      value.setAttribute("aria-live", "polite");

      const inc = document.createElement("button");
      inc.className = "life-btn";
      inc.type = "button";
      inc.textContent = "+";
      inc.setAttribute("aria-label", `Increase life for ${p.name}`);
      inc.dataset.delta = "1";

      // Ensure "- [life] +" stays tight and centered
      controls.append(dec, value, inc);

      const meta = document.createElement("div");
      meta.className = "life-meta";
      const minLabel = document.createElement("span");
      minLabel.textContent = "Min: 0";
      const maxLabel = document.createElement("span");
      maxLabel.textContent = "Max: 99";
      meta.append(minLabel, maxLabel);

      card.append(name, controls, meta);
      return card;
    }),
  );
}

function updateLife(playerId, delta) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  player.life = clamp(player.life + delta, 0, 99);
  renderPlayers();
}

function wireEvents() {
  const root = document.getElementById("players");
  if (!root) return;

  root.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("life-btn")) return;

    const card = target.closest(".player-card");
    const playerId = card?.dataset.playerId;
    if (!playerId) return;

    const deltaRaw = target.dataset.delta;
    const delta = Number(deltaRaw);
    if (!Number.isFinite(delta)) return;

    updateLife(playerId, delta);
  });
}

renderPlayers();
wireEvents();
