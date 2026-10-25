"use strict";

(() => {
  // GitHub Pages uses relative asset paths. Change only this URL to customize the reward.
  const REWARD_URL = "https://ug.hkubs.hku.hk/";
  const GRID_SIZE = 12;
  const WORDS = ["SEARCH", "ENGINE", "OPTIMIZATION"];
  const FRUITS = [
    { id: "strawberry", icon: "🍓", label: "Strawberry" },
    { id: "blueberry", icon: "🫐", label: "Blueberry" },
    { id: "lemon", icon: "🍋", label: "Lemon" },
    { id: "cherry", icon: "🍒", label: "Cherry" },
    { id: "watermelon", icon: "🍉", label: "Watermelon" },
    { id: "professor", label: "Professor" }
  ];
  const LEVEL_HINTS = [
    "A little human intuition",
    "Connect neighboring letters",
    "Find all six matching pairs",
    "Ready when you are",
    "Find the bomb to finish"
  ];
  const $ = id => document.getElementById(id);
  let level = 1;
  let transitioning = false;
  let timeoutIds = new Set();
  let animationId = 0;
  let wordsState;
  let memoryState;
  let reactionState;
  let bombState;

  function randomInt(max) {
    // Rejection sampling avoids biased integer choices, including the bomb's 1–100 range.
    const buffer = new Uint32Array(1);
    const limit = 4294967296 - (4294967296 % max);
    do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
    return buffer[0] % max;
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function later(callback, delay) {
    const id = setTimeout(() => { timeoutIds.delete(id); callback(); }, delay);
    timeoutIds.add(id);
    return id;
  }

  function cleanup() {
    timeoutIds.forEach(clearTimeout);
    timeoutIds.clear();
    cancelAnimationFrame(animationId);
    animationId = 0;
  }

  function feedback(id, text, type = "") {
    $(id).textContent = text;
    $(id).className = `feedback ${type}`.trim();
  }

  function showLevel(next, moveFocus = true) {
    cleanup();
    transitioning = false;
    level = next;
    $("reward").hidden = true;
    $("game").hidden = false;
    document.querySelectorAll(".level-panel").forEach((panel, index) => {
      panel.hidden = index !== level - 1;
    });
    $("level-title").textContent = `Level ${level}`;
    $("footer-hint").textContent = LEVEL_HINTS[level - 1];
    $("progress-text").innerHTML = `${level} <span class="muted">/ 5</span>`;
    $("progress").setAttribute("aria-valuenow", String(level));
    $("progress").setAttribute("aria-valuetext", `Level ${level} of 5`);
    [...$("progress").children].forEach((segment, i) => {
      segment.className = i < level - 1 ? "complete" : i === level - 1 ? "active" : "";
    });
    document.querySelectorAll(".steps li").forEach((step, i) => {
      step.className = i < level - 1 ? "complete" : i === level - 1 ? "active" : "";
      if (i === level - 1) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
    $("verify-button").disabled = true;
    $("refresh-button").disabled = false;
    [initCheckbox, initWords, initMemory, initReaction, initBomb][level - 1]();
    if (moveFocus) $("level-title").focus({ preventScroll: true });
  }

  function completeLevel(delay = 1000) {
    if (transitioning) return;
    transitioning = true;
    $("refresh-button").disabled = true;
    $("verify-button").disabled = true;
    later(() => level === 5 ? showReward() : showLevel(level + 1), delay);
  }

  function initCheckbox() {
    const checkbox = $("human-checkbox");
    checkbox.className = "human-checkbox";
    checkbox.disabled = false;
    checkbox.setAttribute("aria-checked", "false");
    checkbox.removeAttribute("aria-busy");
    $("checkbox-status").textContent = "";
  }

  $("human-checkbox").addEventListener("click", () => {
    if (level !== 1 || transitioning) return;
    const checkbox = $("human-checkbox");
    checkbox.disabled = true;
    checkbox.classList.add("loading");
    checkbox.setAttribute("aria-busy", "true");
    $("refresh-button").disabled = true;
    $("checkbox-status").textContent = "Verifying…";
    later(() => {
      checkbox.className = "human-checkbox checked";
      checkbox.setAttribute("aria-checked", "true");
      checkbox.removeAttribute("aria-busy");
      $("checkbox-status").textContent = "Verified. Welcome, human.";
      completeLevel(1000);
    }, 500);
  });

  function allStraightPaths(length) {
    const paths = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const endRow = row + dr * (length - 1);
            const endCol = col + dc * (length - 1);
            if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;
            paths.push(Array.from({ length }, (_, i) => (row + dr * i) * GRID_SIZE + col + dc * i));
          }
        }
      }
    }
    return paths;
  }

  function generateBoard() {
    const board = Array(GRID_SIZE * GRID_SIZE).fill("");
    // Place the longest word first, then reserve distinct cells for the shorter words.
    for (const word of WORDS.slice().sort((a, b) => b.length - a.length)) {
      const possible = allStraightPaths(word.length).filter(path => path.every(i => !board[i]));
      const path = possible[randomInt(possible.length)];
      path.forEach((cell, index) => { board[cell] = word[index]; });
    }
    return board.map(letter => letter || String.fromCharCode(65 + randomInt(26)));
  }

  function initWords() {
    wordsState = { board: generateBoard(), wordIndex: 0, selected: [], found: new Set() };
    const fragment = document.createDocumentFragment();
    wordsState.board.forEach((letter, index) => {
      const cell = document.createElement("button");
      cell.className = "letter-cell";
      cell.textContent = letter;
      cell.dataset.index = String(index);
      cell.setAttribute("aria-label", `Row ${Math.floor(index / GRID_SIZE) + 1}, column ${index % GRID_SIZE + 1}, ${letter}`);
      cell.setAttribute("aria-pressed", "false");
      fragment.appendChild(cell);
    });
    $("letter-grid").replaceChildren(fragment);
    [...$("word-targets").children].forEach((target, index) => { target.className = index === 0 ? "current" : ""; });
    $("clear-word").disabled = false;
    updateWordSelection();
    feedback("word-status", "Start with the S in SEARCH.");
  }

  function updateWordSelection() {
    const state = wordsState;
    if (state.wordIndex === WORDS.length) {
      $("word-selection").textContent = "All words found ✓";
      return;
    }
    const word = WORDS[state.wordIndex];
    $("word-selection").textContent = "Selected: " + [...word].map((char, i) => i < state.selected.length ? char : "_").join(" ");
  }

  function adjacent(a, b) {
    return a !== b && Math.abs(Math.floor(a / GRID_SIZE) - Math.floor(b / GRID_SIZE)) <= 1 && Math.abs(a % GRID_SIZE - b % GRID_SIZE) <= 1;
  }

  $("letter-grid").addEventListener("click", event => {
    const cell = event.target.closest(".letter-cell");
    if (!cell || level !== 2 || transitioning || wordsState.wordIndex === WORDS.length) return;
    const index = Number(cell.dataset.index);
    const state = wordsState;
    if (state.selected.at(-1) === index) {
      state.selected.pop();
      cell.classList.remove("selected");
      cell.setAttribute("aria-pressed", "false");
      updateWordSelection();
      feedback("word-status", "Last letter undone. Keep connecting.");
      return;
    }
    const word = WORDS[state.wordIndex];
    const expected = word[state.selected.length];
    if (state.selected.includes(index) || (state.selected.length && !adjacent(state.selected.at(-1), index)) || state.board[index] !== expected) {
      cell.classList.add("wrong");
      later(() => cell.classList.remove("wrong"), 350);
      feedback("word-status", state.selected.length ? `Select a neighboring ${expected}. Clear the word to try a different path.` : `Start with the ${expected} in ${word}.`, "error");
      return;
    }
    state.selected.push(index);
    cell.classList.add("selected");
    cell.setAttribute("aria-pressed", "true");
    feedback("word-status", `Look for the next letter: ${word[state.selected.length] || ""}.`);
    if (state.selected.length === word.length) {
      state.selected.forEach(i => {
        state.found.add(i);
        const foundCell = $("letter-grid").children[i];
        foundCell.className = "letter-cell found";
        // Later words may share a previously found letter; only repeats within one word are rejected.
        foundCell.disabled = false;
      });
      $("word-targets").children[state.wordIndex].className = "found";
      state.wordIndex++;
      state.selected = [];
      if (state.wordIndex === WORDS.length) {
        $("verify-button").disabled = false;
        $("clear-word").disabled = true;
        feedback("word-status", "All three words found! Click Verify to continue.", "success");
      } else {
        $("word-targets").children[state.wordIndex].className = "current";
        feedback("word-status", `${word} found! Next up: ${WORDS[state.wordIndex]}.`, "success");
      }
    }
    updateWordSelection();
  });

  $("clear-word").addEventListener("click", () => {
    if (level !== 2 || transitioning || wordsState.wordIndex === WORDS.length) return;
    wordsState.selected.forEach(i => {
      const cell = $("letter-grid").children[i];
      cell.classList.remove("selected");
      cell.setAttribute("aria-pressed", "false");
    });
    wordsState.selected = [];
    updateWordSelection();
    feedback("word-status", `Start again with ${WORDS[wordsState.wordIndex][0]}. Completed words are saved.`);
  });

  $("verify-button").addEventListener("click", () => {
    if (level === 2 && wordsState.wordIndex === WORDS.length) completeLevel(200);
  });

  function initMemory() {
    // A fresh Fisher–Yates shuffle runs on every entry and every refresh of this level.
    memoryState = { deck: shuffle([...FRUITS, ...FRUITS]), open: [], matched: new Set(), locked: false, pairs: 0 };
    const fragment = document.createDocumentFragment();
    memoryState.deck.forEach((item, index) => {
      const card = document.createElement("button");
      card.className = "memory-card";
      card.dataset.index = String(index);
      card.setAttribute("aria-label", `Turn over card ${index + 1}`);
      card.setAttribute("aria-pressed", "false");
      const inner = document.createElement("span");
      inner.className = "card-inner";
      inner.setAttribute("aria-hidden", "true");
      const back = document.createElement("span");
      back.className = "card-back";
      back.innerHTML = "<span>?</span>";
      const face = document.createElement("span");
      face.className = "card-face";
      if (item.id === "professor") {
        face.classList.add("professor-face");
        const photo = document.createElement("img");
        photo.src = "assets/professor.png";
        photo.alt = "Professor portrait";
        photo.width = 48;
        photo.height = 48;
        face.appendChild(photo);
      } else {
        const icon = document.createElement("span");
        icon.textContent = item.icon;
        face.appendChild(icon);
      }
      const label = document.createElement("small");
      label.textContent = item.label;
      face.appendChild(label);
      inner.append(back, face);
      card.appendChild(inner);
      fragment.appendChild(card);
    });
    $("memory-grid").replaceChildren(fragment);
    $("match-count").textContent = "0 / 6";
    feedback("memory-status", "");
  }

  $("memory-grid").addEventListener("click", event => {
    const card = event.target.closest(".memory-card");
    if (!card || level !== 3 || transitioning) return;
    const state = memoryState;
    const index = Number(card.dataset.index);
    if (state.locked || state.matched.has(index) || state.open.includes(index)) return;
    card.classList.add("flipped");
    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", `Card ${index + 1}: ${state.deck[index].label}`);
    state.open.push(index);
    if (state.open.length < 2) {
      feedback("memory-status", "Remember this card. Now turn over another.");
      return;
    }
    const [first, second] = state.open;
    if (state.deck[first].id === state.deck[second].id) {
      state.open.forEach(i => {
        state.matched.add(i);
        const matchedCard = $("memory-grid").children[i];
        matchedCard.classList.add("matched");
        matchedCard.disabled = true;
        matchedCard.setAttribute("aria-label", `${state.deck[i].label}, matched`);
      });
      state.open = [];
      state.pairs++;
      $("match-count").textContent = `${state.pairs} / 6`;
      feedback("memory-status", state.pairs === 6 ? "All six pairs found. Memory verified!" : `A match! ${6 - state.pairs} pairs to go.`, "success");
      if (state.pairs === 6) completeLevel(1000);
    } else {
      state.locked = true;
      feedback("memory-status", "Not quite a match. Remember where they are.");
      later(() => {
        state.open.forEach(i => {
          const oldCard = $("memory-grid").children[i];
          oldCard.classList.remove("flipped");
          oldCard.setAttribute("aria-pressed", "false");
          oldCard.setAttribute("aria-label", `Turn over card ${i + 1}`);
        });
        state.open = [];
        state.locked = false;
        feedback("memory-status", "Try again. Where is your next pair?");
      }, 1000);
    }
  });

  function renderTime(milliseconds) {
    $("timer").innerHTML = `${(milliseconds / 1000).toFixed(3)}<span>s</span>`;
  }

  function initReaction() {
    reactionState = { running: false, started: 0, passed: false };
    renderTime(0);
    $("timer").classList.remove("running");
    $("timer-button").disabled = false;
    $("timer-button").innerHTML = 'Start timer <span aria-hidden="true">→</span>';
    $("reaction-continue").hidden = true;
    feedback("reaction-status", "Ready? Trust your instinct.");
  }

  function tick() {
    if (level !== 4 || !reactionState.running) return;
    renderTime(performance.now() - reactionState.started);
    animationId = requestAnimationFrame(tick);
  }

  function startReaction() {
    if (transitioning || reactionState.running || reactionState.passed) return;
    reactionState.started = performance.now();
    reactionState.running = true;
    $("timer").classList.add("running");
    $("timer-button").innerHTML = 'Stop timer <span aria-hidden="true">■</span>';
    feedback("reaction-status", "Counting… Press Space or tap the button to stop.");
    tick();
  }

  function stopReaction() {
    if (!reactionState.running || transitioning) return;
    const elapsed = performance.now() - reactionState.started;
    reactionState.running = false;
    cancelAnimationFrame(animationId);
    $("timer").classList.remove("running");
    renderTime(elapsed);
    if (elapsed >= 990 && elapsed <= 1010) {
      feedback("reaction-status", "Robot behavior detected. That was too precise. Please try again.", "error");
      $("timer-button").innerHTML = 'Try again <span aria-hidden="true">↻</span>';
    } else {
      reactionState.passed = true;
      feedback("reaction-status", "Congratulations! You passed the human verification test. A human can’t stop at exactly 1.000 seconds. Your imperfection proves you’re human!", "success");
      $("timer-button").disabled = true;
      $("reaction-continue").hidden = false;
      $("footer-hint").textContent = "Human verified. Continue when ready.";
    }
  }

  $("timer-button").addEventListener("click", () => {
    if (level !== 4 || transitioning) return;
    reactionState.running ? stopReaction() : startReaction();
  });
  $("reaction-continue").addEventListener("click", () => {
    if (level === 4 && reactionState.passed && !transitioning) showLevel(5);
  });
  document.addEventListener("keydown", event => {
    if (level !== 4 || event.code !== "Space" || $("about-dialog").open) return;
    // Prevent key repeats or a held key from triggering a second button click.
    if (reactionState.running || transitioning) {
      event.preventDefault();
      if (!event.repeat && reactionState.running) stopReaction();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && level === 4 && reactionState.running) {
      cancelAnimationFrame(animationId);
      initReaction();
      feedback("reaction-status", "Timer paused while you were away. Please start again.");
    }
  });

  function initBomb() {
    // Draw a fresh target on every level entry or refresh. All 100 integers are eligible;
    // the number is never rounded to a multiple of ten or changed by a player's guesses.
    bombState = { bomb: randomInt(100) + 1, low: 1, high: 100, guesses: new Set() };
    $("bomb-input").value = "";
    $("bomb-input").disabled = false;
    $("bomb-form").querySelector("button").disabled = false;
    $("guess-history").replaceChildren();
    updateRange();
    feedback("bomb-status", "Enter a whole number from 1 to 100 to find the bomb.");
  }

  function updateRange() {
    const { low, high } = bombState;
    $("range-low").textContent = low;
    $("range-high").textContent = high;
    $("range-fill").style.left = `${(low - 1) / 100 * 100}%`;
    $("range-fill").style.width = `${(high - low + 1) / 100 * 100}%`;
    $("bomb-input").min = low;
    $("bomb-input").max = high;
    $("bomb-input").placeholder = `Enter ${low}–${high}`;
  }

  $("bomb-form").addEventListener("submit", event => {
    event.preventDefault();
    if (level !== 5 || transitioning) return;
    const state = bombState;
    const raw = $("bomb-input").value.trim();
    const value = Number(raw);
    if (!raw || !Number.isInteger(value) || value < state.low || value > state.high) {
      feedback("bomb-status", `Please enter a whole number from ${state.low} to ${state.high}.`, "error");
      $("bomb-input").focus();
      return;
    }
    if (state.guesses.has(value)) return;
    state.guesses.add(value);
    const tag = document.createElement("span");
    const hit = value === state.bomb;
    tag.textContent = `${value} ${hit ? "✓" : value < state.bomb ? "↑" : "↓"}`;
    if (hit) tag.className = "hit";
    $("guess-history").appendChild(tag);
    if (hit) {
      feedback("bomb-status", "You found the bomb! Only a human could be this unpredictable.", "success");
      $("bomb-input").disabled = true;
      $("bomb-form").querySelector("button").disabled = true;
      completeLevel(1300);
    } else {
      // Exclude a proven-safe guess so every valid miss strictly shrinks the range.
      if (value < state.bomb) state.low = value + 1;
      else state.high = value - 1;
      updateRange();
      feedback("bomb-status", state.low === state.high ? `Only ${state.low} remains. Enter it to unlock the final answer!` : `The bomb is between ${state.low} and ${state.high}. ${value < state.bomb ? "Try higher." : "Try lower."}`);
      $("bomb-input").value = "";
      $("bomb-input").focus();
    }
  });

  function showReward() {
    cleanup();
    transitioning = true;
    $("game").hidden = true;
    $("reward").hidden = false;
    $("reward-link").href = REWARD_URL;
    $("reward-link").focus({ preventScroll: true });
    const fragment = document.createDocumentFragment();
    const colors = ["#4285f4", "#34a853", "#fbbc05", "#ea7366", "#98b8ef"];
    for (let i = 0; i < 64; i++) {
      const piece = document.createElement("i");
      piece.style.left = `${randomInt(100)}%`;
      piece.style.backgroundColor = colors[randomInt(colors.length)];
      piece.style.animationDelay = `${randomInt(1500) / 1000}s`;
      piece.style.animationDuration = `${2.4 + randomInt(1500) / 1000}s`;
      fragment.appendChild(piece);
    }
    $("confetti").replaceChildren(fragment);
    $("countdown").textContent = "3";
    later(() => { $("countdown").textContent = "2"; }, 1000);
    later(() => { $("countdown").textContent = "1"; }, 2000);
    later(() => { window.location.href = REWARD_URL; }, 3000);
  }

  $("refresh-button").addEventListener("click", () => { if (!transitioning) showLevel(level); });
  $("restart-button").addEventListener("click", () => showLevel(1));
  $("about-button").addEventListener("click", () => {
    if (level === 4 && reactionState.running) {
      cancelAnimationFrame(animationId);
      initReaction();
    }
    $("about-dialog").showModal();
  });
  $("close-about").addEventListener("click", () => $("about-dialog").close());
  $("about-done").addEventListener("click", () => $("about-dialog").close());
  showLevel(1, false);
})();
