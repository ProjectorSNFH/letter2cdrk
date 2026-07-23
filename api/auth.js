// PIN을 검증하고 역할(role)과 이름을 돌려주는 API
// PIN -> {role, name} 매핑은 Vercel 환경변수 PIN_CONFIG(JSON 문자열)에서 읽는다.
// 예) {"1234":{"role":"send","name":"철수"},"9999":{"role":"sent","name":"지민"}}
// role: "send" = 편지 쓰는 친구, "sent" = 이민 가는(받는) 친구

function loadPinConfig() {
  try {
    return JSON.parse(process.env.PIN_CONFIG || "{}");
  } catch (e) {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }

  const config = loadPinConfig();
  if (!config) {
    return res
      .status(500)
      .json({ ok: false, error: "서버의 PIN_CONFIG 설정이 올바르지 않습니다." });
  }

  const { pin } = req.body || {};
  if (!pin || typeof pin !== "string" || pin.length !== 4) {
    return res.status(400).json({ ok: false, error: "4자리 PIN이 필요합니다." });
  }

  const entry = config[pin];
  if (!entry || !entry.role || !entry.name) {
    return res.status(401).json({ ok: false });
  }

  return res.status(200).json({ ok: true, role: entry.role, name: entry.name });
}
