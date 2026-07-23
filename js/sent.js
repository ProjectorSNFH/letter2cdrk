(async function () {
  const session = requireSession("sent");
  if (!session) return;

  document.getElementById("topbar").innerHTML =
    `${session.name}, 친구들이 편지를 보냈어. 봉투를 눌러 열어봐`;

  const field = document.getElementById("sky-field");
  const overlay = document.getElementById("reader-overlay");
  const paperText = document.getElementById("paper-text");
  const paperScroll = document.getElementById("paper-scroll");
  const emojiBar = document.getElementById("emoji-bar");

  let allLetters = [];
  let envelopeEls = {};
  let currentLetter = null;
  let typeTimer = null;
  let dragScrollBound = false;

  await refreshLetters();
  layoutEnvelopes();
  window.addEventListener("resize", layoutEnvelopes);

  document.getElementById("reader-close").addEventListener("click", closeReader);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeReader();
  });

  // ---------------- 데이터 ----------------
  async function refreshLetters() {
    const res = await apiGetLetters(session.pin);
    if (res.ok) allLetters = res.letters;
    return allLetters;
  }

  // ---------------- 밤하늘 봉투 배치 ----------------
  function layoutEnvelopes() {
    field.innerHTML = "";
    envelopeEls = {};
    const placed = [];

    allLetters.forEach((letter) => {
      let x, y, tries = 0;
      do {
        x = 8 + Math.random() * 76;
        y = 18 + Math.random() * 56;
        tries++;
      } while (
        placed.some((p) => Math.abs(p.x - x) < 15 && Math.abs(p.y - y) < 18) &&
        tries < 30
      );
      placed.push({ x, y });

      const env = document.createElement("div");
      env.className = "envelope" + (letter.readAt ? " read" : "");
      env.style.left = x + "%";
      env.style.top = y + "%";
      env.style.setProperty("--r", (Math.random() * 10 - 5).toFixed(1) + "deg");
      env.style.animationDelay = (Math.random() * 3).toFixed(2) + "s";
      env.style.animationDuration = (4.2 + Math.random() * 2).toFixed(2) + "s";
      env.innerHTML = `
        <div class="body"></div>
        <div class="flap"></div>
        <div class="glow"></div>
        <div class="from">${escapeHtml(letter.authorName)}</div>
      `;
      env.addEventListener("click", () => openReader(letter));
      field.appendChild(env);
      envelopeEls[letter.id] = env;
    });
  }

  // ---------------- 편지 열기 ----------------
  function openReader(letter) {
    currentLetter = letter;
    clearTimeout(typeTimer);
    overlay.classList.remove("stage-rise", "stage-open", "stage-paper");
    emojiBar.classList.remove("show");
    paperText.innerHTML = "";
    paperScroll.scrollTop = 0;
    overlay.classList.add("open");

    setTimeout(() => overlay.classList.add("stage-rise"), 30);
    setTimeout(() => overlay.classList.add("stage-open"), 520);
    setTimeout(() => overlay.classList.add("stage-paper"), 1060);
    setTimeout(() => startContent(letter), 1620);
  }

  function startContent(letter) {
    if (!isMobile() && !dragScrollBound) {
      enableDragScroll(paperScroll);
      dragScrollBound = true;
    }

    if (letter.readAt) {
      // 이미 완독한 편지 - 처음부터 전체 노출 + 이모지 바 즉시 표시
      paperText.textContent = letter.content;
      renderEmojiBar();
      emojiBar.classList.add("show");
    } else {
      typewrite(letter.content, async () => {
        const res = await apiMarkRead(session.pin, letter.id);
        if (res.ok) {
          currentLetter = res.letter;
          const idx = allLetters.findIndex((l) => l.id === letter.id);
          if (idx > -1) allLetters[idx].readAt = res.letter.readAt;
          const el = envelopeEls[letter.id];
          if (el) el.classList.add("read");
        }
        renderEmojiBar();
        emojiBar.classList.add("show");
      });
    }
  }

  function typewrite(text, onDone) {
    let i = 0;
    const speed = 26; // ms / 글자
    const cursor = document.createElement("span");
    cursor.className = "cursor";

    function step() {
      if (i < text.length) {
        paperText.textContent = text.slice(0, i + 1);
        paperText.appendChild(cursor);
        paperScroll.scrollTop = paperScroll.scrollHeight;
        i++;
        typeTimer = setTimeout(step, speed);
      } else {
        cursor.remove();
        onDone && onDone();
      }
    }
    step();
  }

  // ---------------- 편지 닫기 ----------------
  function closeReader() {
    clearTimeout(typeTimer);
    overlay.classList.remove("stage-paper");
    setTimeout(() => overlay.classList.remove("stage-open"), 150);
    setTimeout(() => overlay.classList.remove("stage-rise"), 350);
    setTimeout(() => overlay.classList.remove("open"), 550);
    emojiBar.classList.remove("show");
  }

  // ---------------- 이모지 바 ----------------
  function renderEmojiBar() {
    emojiBar.innerHTML = "";
    let widthPx = 30;

    if (currentLetter.emoji) {
      const chip = document.createElement("div");
      chip.className = "emoji-chip";
      chip.textContent = currentLetter.emoji;
      chip.title = "탭해서 바꾸기";
      chip.addEventListener("click", showEmojiInput);
      emojiBar.appendChild(chip);
      widthPx += 40;
    }

    const plus = document.createElement("button");
    plus.className = "emoji-plus";
    plus.textContent = "+";
    plus.title = "이모지 남기기";
    plus.addEventListener("click", showEmojiInput);
    emojiBar.appendChild(plus);
    widthPx += 46;

    emojiBar.style.setProperty("--bar-w", widthPx + "px");
  }

  function showEmojiInput() {
    emojiBar.style.setProperty("--bar-w", "230px");
    emojiBar.innerHTML = `
      <div class="emoji-input-wrap">
        <input class="emoji-input" id="emoji-input" maxlength="8" />
        <span class="emoji-hint">모바일: 키보드의 지구본/이모지 아이콘 · 데스크탑: Win+. 또는 Cmd+Ctrl+Space</span>
      </div>
    `;
    const inp = document.getElementById("emoji-input");
    inp.focus();

    inp.addEventListener("input", async () => {
      const g = firstGrapheme(inp.value);
      if (!g) return;
      const res = await apiSetEmoji(session.pin, currentLetter.id, g);
      if (res.ok) currentLetter.emoji = res.letter.emoji;
      renderEmojiBar();
    });

    inp.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.getElementById("emoji-input")) renderEmojiBar();
      }, 150);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
