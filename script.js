(() => {
  const CAPACITY = 4;
  const COLOR_COUNT = 4;
  const EMPTY_COUNT = 2;
  const BOTTLE_COUNT = COLOR_COUNT + EMPTY_COUNT;
  const COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa"];

  const boardEl = document.getElementById("board");
  const moveEl = document.getElementById("move-count");
  const statusEl = document.getElementById("status");
  const modalEl = document.getElementById("clear-modal");
  const clearDetailEl = document.getElementById("clear-detail");

  let tubes = [];
  let initialTubes = [];
  let selected = null;
  let moves = 0;
  let cleared = false;

  function clone(state) {
    return state.map((tube) => tube.slice());
  }

  function topColor(tube) {
    return tube.length ? tube[tube.length - 1] : null;
  }

  function topRun(tube) {
    if (!tube.length) return { color: null, count: 0 };
    const color = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0 && tube[i] === color; i -= 1) {
      count += 1;
    }
    return { color, count };
  }

  function isComplete(tube) {
    return tube.length === CAPACITY && tube.every((c) => c === tube[0]);
  }

  function isSolved(state) {
    return state.every((tube) => tube.length === 0 || isComplete(tube));
  }

  function canPour(state, from, to) {
    if (from === to) return false;
    const source = state[from];
    const dest = state[to];
    if (!source.length || dest.length >= CAPACITY) return false;
    const destTop = topColor(dest);
    return destTop === null || destTop === topColor(source);
  }

  function pour(state, from, to) {
    const next = clone(state);
    const { color, count } = topRun(next[from]);
    const space = CAPACITY - next[to].length;
    const amount = Math.min(count, space);
    for (let i = 0; i < amount; i += 1) {
      next[to].push(next[from].pop());
    }
    return { next, amount };
  }

  function serialize(state) {
    return state.map((tube) => tube.join(",")).sort().join("|");
  }

  function possibleMoves(state) {
    const list = [];
    for (let i = 0; i < state.length; i += 1) {
      if (!state[i].length || isComplete(state[i])) continue;
      for (let j = 0; j < state.length; j += 1) {
        if (canPour(state, i, j)) list.push([i, j]);
      }
    }
    return list;
  }

  function isSolvable(start) {
    if (isSolved(start)) return false;
    const queue = [clone(start)];
    const seen = new Set([serialize(start)]);
    while (queue.length) {
      const current = queue.shift();
      const movesHere = possibleMoves(current);
      for (let n = 0; n < movesHere.length; n += 1) {
        const [from, to] = movesHere[n];
        const { next } = pour(current, from, to);
        const key = serialize(next);
        if (seen.has(key)) continue;
        if (isSolved(next)) return true;
        seen.add(key);
        if (seen.size > 12000) return false;
        queue.push(next);
      }
    }
    return false;
  }

  function solvedState() {
    const state = [];
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      state.push(Array(CAPACITY).fill(color));
    }
    for (let i = 0; i < EMPTY_COUNT; i += 1) state.push([]);
    return state;
  }

  function scramble(depth) {
    const state = solvedState();
    for (let step = 0; step < depth; step += 1) {
      const options = [];
      for (let i = 0; i < state.length; i += 1) {
        if (!state[i].length) continue;
        for (let j = 0; j < state.length; j += 1) {
          if (i === j || state[j].length >= CAPACITY) continue;
          options.push([i, j]);
        }
      }
      if (!options.length) break;
      const [from, to] = options[Math.floor(Math.random() * options.length)];
      state[to].push(state[from].pop());
    }
    return state;
  }

  function generatePuzzle() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = scramble(28 + (attempt % 12));
      if (isSolvable(candidate)) return candidate;
    }
    return scramble(20);
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function render() {
    boardEl.innerHTML = "";
    tubes.forEach((tube, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bottle";
      if (selected === index) btn.classList.add("selected");
      if (isComplete(tube)) btn.classList.add("complete");
      btn.setAttribute("aria-label", `試験管${index + 1}`);
      btn.addEventListener("click", () => onBottleClick(index));

      tube.forEach((colorIndex) => {
        const layer = document.createElement("span");
        layer.className = "layer";
        layer.style.setProperty("--c", COLORS[colorIndex]);
        btn.appendChild(layer);
      });

      boardEl.appendChild(btn);
    });
    moveEl.textContent = String(moves);
  }

  function hideModal() {
    modalEl.hidden = true;
  }

  function showClear() {
    cleared = true;
    selected = null;
    clearDetailEl.textContent = `${moves} 手でクリアしました。すべての試験管の色がそろいました。`;
    modalEl.hidden = false;
    setStatus("クリアです。新しいゲームかリセットを選べます。");
  }

  function onBottleClick(index) {
    if (cleared) return;

    if (selected === null) {
      if (!tubes[index].length) {
        setStatus("空の試験管です。水が入っている管を選んでください。");
        return;
      }
      selected = index;
      setStatus("移動先の試験管を選んでください。");
      render();
      return;
    }

    if (selected === index) {
      selected = null;
      setStatus("選択を解除しました。");
      render();
      return;
    }

    if (!canPour(tubes, selected, index)) {
      setStatus("移せません。空きがあること、一番上の色が同じ（または空）であることが条件です。");
      selected = index;
      render();
      return;
    }

    const { next, amount } = pour(tubes, selected, index);
    if (amount === 0) {
      selected = null;
      render();
      return;
    }

    tubes = next;
    moves += 1;
    selected = null;
    render();

    if (isSolved(tubes)) {
      showClear();
      return;
    }
    setStatus("移しました。次の試験管を選んでください。");
  }

  function resetGame() {
    tubes = clone(initialTubes);
    selected = null;
    moves = 0;
    cleared = false;
    hideModal();
    setStatus("配置をやり直しました。試験管を選んでください。");
    render();
  }

  function newGame() {
    initialTubes = generatePuzzle();
    tubes = clone(initialTubes);
    selected = null;
    moves = 0;
    cleared = false;
    hideModal();
    setStatus("新しい配置です。試験管を選んで水を移してください。");
    render();
  }

  document.getElementById("btn-reset").addEventListener("click", resetGame);
  document.getElementById("btn-new").addEventListener("click", newGame);
  document.getElementById("btn-modal-reset").addEventListener("click", resetGame);
  document.getElementById("btn-modal-new").addEventListener("click", newGame);

  newGame();
})();
