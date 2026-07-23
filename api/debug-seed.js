// ⚠️ 테스트 전용 임시 API — 확인 끝나면 이 파일은 삭제하고 재배포하세요.
// GET  /api/debug-seed         : 저장된 letters 해시 전체를 그대로 반환 (KV 연결 확인용)
// POST /api/debug-seed         : 더미 편지 2건을 삽입
// DELETE /api/debug-seed       : letters 해시를 통째로 삭제 (테스트 데이터 정리용)

import { kv } from "@vercel/kv";
import { randomUUID } from "node:crypto";

const HASH_KEY = "letters";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const all = (await kv.hgetall(HASH_KEY)) || {};
    return res.status(200).json({ ok: true, count: Object.keys(all).length, letters: all });
  }

  if (req.method === "POST") {
    const dummies = [
      {
        id: randomUUID(),
        authorPin: "0000-dummy-1",
        authorName: "테스트철수",
        content:
          "그동안 정말 고마웠어. 낯선 곳에서도 잘 지내길 바라고, 언제든 힘들면 연락해. 우리 우정은 거리로 안 변할거야.",
        createdAt: Date.now(),
        readAt: null,
        emoji: null,
      },
      {
        id: randomUUID(),
        authorPin: "0000-dummy-2",
        authorName: "테스트영희",
        content:
          "떠난다니까 아직도 실감이 안 나. 새로운 곳에서 좋은 사람들 만나고, 가끔 사진도 보내줘! 보고싶을 거야.",
        createdAt: Date.now(),
        readAt: null,
        emoji: null,
      },
    ];

    const payload = {};
    dummies.forEach((d) => (payload[d.id] = d));
    await kv.hset(HASH_KEY, payload);

    return res.status(200).json({ ok: true, inserted: dummies.length, letters: dummies });
  }

  if (req.method === "DELETE") {
    await kv.del(HASH_KEY);
    return res.status(200).json({ ok: true, message: "letters 해시를 삭제했습니다." });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ ok: false });
}
