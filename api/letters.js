import { kv } from "@vercel/kv";
import { randomUUID } from "node:crypto";

const HASH_KEY = "letters";

function loadPinConfig() {
  try {
    return JSON.parse(process.env.PIN_CONFIG || "{}");
  } catch (e) {
    return {};
  }
}

function authenticate(pin) {
  if (!pin) return null;
  const config = loadPinConfig();
  const entry = config[pin];
  return entry ? { pin, role: entry.role, name: entry.name } : null;
}

export default async function handler(req, res) {
  const { method } = req;

  // ---------- GET: 편지 목록/내 편지 조회 ----------
  if (method === "GET") {
    const pin = req.query.pin;
    const user = authenticate(pin);
    if (!user) return res.status(401).json({ ok: false });

    const all = (await kv.hgetall(HASH_KEY)) || {};
    const letters = Object.values(all);

    if (user.role === "send") {
      const mine = letters.find((l) => l.authorPin === pin) || null;
      return res.status(200).json({ ok: true, letter: mine });
    }

    if (user.role === "sent") {
      const list = letters
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((l) => ({
          id: l.id,
          authorName: l.authorName,
          content: l.content,
          createdAt: l.createdAt,
          readAt: l.readAt,
          emoji: l.emoji,
        }));
      return res.status(200).json({ ok: true, letters: list });
    }

    return res.status(403).json({ ok: false });
  }

  // ---------- POST: 새 편지 작성 (send 역할 전용, 1인 1편지) ----------
  if (method === "POST") {
    const { pin, content } = req.body || {};
    const user = authenticate(pin);
    if (!user || user.role !== "send") {
      return res.status(403).json({ ok: false });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ ok: false, error: "편지 내용이 비어 있습니다." });
    }

    const all = (await kv.hgetall(HASH_KEY)) || {};
    const existing = Object.values(all).find((l) => l.authorPin === pin);
    if (existing) {
      return res.status(409).json({ ok: false, error: "이미 편지를 보냈습니다.", letter: existing });
    }

    const id = randomUUID();
    const letter = {
      id,
      authorPin: pin,
      authorName: user.name,
      content: content.trim(),
      createdAt: Date.now(),
      readAt: null,
      emoji: null,
    };

    await kv.hset(HASH_KEY, { [id]: letter });
    return res.status(200).json({ ok: true, letter });
  }

  // ---------- PATCH: 읽음 처리 / 이모지 반응 (sent 역할 전용) ----------
  if (method === "PATCH") {
    const { pin, id, action, emoji } = req.body || {};
    const user = authenticate(pin);
    if (!user || user.role !== "sent") {
      return res.status(403).json({ ok: false });
    }

    const letter = await kv.hget(HASH_KEY, id);
    if (!letter) return res.status(404).json({ ok: false });

    if (action === "read") {
      if (!letter.readAt) letter.readAt = Date.now();
    } else if (action === "emoji") {
      if (typeof emoji !== "string" || !emoji.trim()) {
        return res.status(400).json({ ok: false, error: "emoji가 필요합니다." });
      }
      letter.emoji = emoji.trim();
    } else {
      return res.status(400).json({ ok: false, error: "알 수 없는 action" });
    }

    await kv.hset(HASH_KEY, { [id]: letter });
    return res.status(200).json({ ok: true, letter });
  }

  res.setHeader("Allow", "GET, POST, PATCH");
  return res.status(405).json({ ok: false });
}
