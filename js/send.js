(async function () {
  const session = requireSession("send");
  if (!session) return;

  document.getElementById("topbar").innerHTML = `<b>${session.name}</b>의 편지함`;
  const area = document.getElementById("content-area");

  const { letter } = await apiGetLetters(session.pin);

  if (letter) {
    renderLetterCard(letter);
  } else {
    renderCompose();
  }

  // ---------------- 작성 화면 ----------------
  function renderCompose() {
    area.innerHTML = `
      <div class="compose-card">
        <textarea id="letter-input" placeholder="떠나는 친구에게 전하고 싶은 이야기를 적어줘..." maxlength="4000"></textarea>
        <div class="compose-footer">
          <span class="char-count" id="char-count">0 / 4000</span>
          <button class="send-btn" id="send-btn" disabled>편지 보내기</button>
        </div>
      </div>
    `;

    const textarea = document.getElementById("letter-input");
    const count = document.getElementById("char-count");
    const btn = document.getElementById("send-btn");

    textarea.addEventListener("input", () => {
      const len = textarea.value.length;
      count.textContent = `${len} / 4000`;
      btn.disabled = textarea.value.trim().length === 0;
    });

    btn.addEventListener("click", async () => {
      const content = textarea.value.trim();
      if (!content) return;
      btn.disabled = true;
      btn.textContent = "보내는 중...";

      const result = await apiCreateLetter(session.pin, content);
      if (result.ok) {
        renderLetterCard(result.letter);
      } else if (result.letter) {
        // 이미 보낸 상태였다면 그 편지를 보여줌
        renderLetterCard(result.letter);
      } else {
        btn.disabled = false;
        btn.textContent = "편지 보내기";
        alert("전송에 실패했어요. 다시 시도해줘.");
      }
    });
  }

  // ---------------- 보낸 편지 확인 화면 ----------------
  function renderLetterCard(letter) {
    area.innerHTML = `
      <div class="letter-card">
        <div class="content">${escapeHtml(letter.content)}</div>
        ${letter.emoji ? `<div class="stamp">${letter.emoji}</div>` : ""}
        <div class="read-status ${letter.readAt ? "" : "unread"}">
          ${letter.readAt ? `읽음 · ${formatReadTime(letter.readAt)}` : "아직 읽지 않았어요"}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
