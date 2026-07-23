// ===== 세션 (탭 닫으면 사라짐 - 친구들끼리 쓰는 용도라 가볍게) =====
const SESSION_KEY = "farewell_session";

function saveSession(s) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch (e) {
    return null;
  }
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// role이 다르거나 로그인 안 했으면 로그인 화면으로 되돌림
function requireSession(expectedRole) {
  const s = getSession();
  if (!s || !s.pin || s.role !== expectedRole) {
    location.href = "login.html";
    return null;
  }
  return s;
}

// ===== API =====
async function apiAuth(pin) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return res.json();
}

async function apiGetLetters(pin) {
  const res = await fetch(`/api/letters?pin=${encodeURIComponent(pin)}`);
  return res.json();
}

async function apiCreateLetter(pin, content) {
  const res = await fetch("/api/letters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, content }),
  });
  return res.json();
}

async function apiMarkRead(pin, id) {
  const res = await fetch("/api/letters", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, id, action: "read" }),
  });
  return res.json();
}

async function apiSetEmoji(pin, id, emoji) {
  const res = await fetch("/api/letters", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, id, action: "emoji", emoji }),
  });
  return res.json();
}

// ===== 유틸 =====
function isMobile() {
  return (
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
  );
}

function formatReadTime(ts) {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m.toString().padStart(2, "0");
  return `${month}월 ${day}일 ${ampm} ${h}:${mm}`;
}

// 문자열에서 첫 "이모지 한 덩어리"(grapheme)만 추출
function firstGrapheme(str) {
  if (!str) return "";
  if (window.Intl && Intl.Segmenter) {
    const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
    for (const { segment } of seg.segment(str)) return segment;
    return "";
  }
  return Array.from(str)[0] || "";
}

// 마우스 드래그로 종이를 밀어 올리듯 스크롤 (데스크탑 전용, 모바일은 네이티브 터치 스크롤 사용)
function enableDragScroll(el) {
  let isDown = false;
  let startY = 0;
  let startScroll = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return; // 모바일은 네이티브 스크롤에 맡김
    isDown = true;
    startY = e.clientY;
    startScroll = el.scrollTop;
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
  });
  el.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const dy = e.clientY - startY;
    el.scrollTop = startScroll - dy;
  });
  const stop = () => {
    isDown = false;
    el.classList.remove("dragging");
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointerleave", stop);
  el.addEventListener("pointercancel", stop);
}
