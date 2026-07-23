# 편지함 (farewell-letters)

친한 친구들끼리만 쓰는 이민 송별 편지 사이트.
정적 페이지(HTML/CSS/JS) + Vercel Serverless Functions + Vercel KV(Redis)로 동작합니다.

## 파일 구조

```
letters/
├── login.html          4자리 PIN 입력 화면 (진입점)
├── send.html            보내는 친구용 화면 뼈대
├── sent.html             받는(이민 가는) 친구용 화면 뼈대
├── css/
│   └── style.css        전체 공통 스타일 · 애니메이션
├── js/
│   ├── common.js         세션 관리 · API 호출 함수 · 공용 유틸 (모든 페이지에서 공유)
│   ├── send.js            send.html 전용 로직 (편지 작성 / 내 편지 확인)
│   └── sent.js             sent.html 전용 로직 (봉투 필드 / 열람 애니메이션 / 이모지)
├── api/
│   ├── auth.js            PIN 검증 → { role, name } 반환
│   └── letters.js          편지 CRUD (GET/POST/PATCH) - Vercel KV 사용
├── package.json
└── vercel.json            "/" 접속 시 login.html로 라우팅
```

- `login.html`이 실질적인 첫 진입 화면입니다. `vercel.json`의 rewrite 덕분에 루트 도메인(`/`)으로 들어가도 자동으로 `login.html`이 보여집니다.
- `common.js`는 세 페이지 모두에서 `<script>`로 불러오는 공용 파일입니다. 세션은 `sessionStorage`에 저장되며 탭을 닫으면 사라집니다(친구들끼리 가볍게 쓰는 용도라 별도 로그인 서버 없이 PIN 자체로 매 API 요청을 인증합니다).
- 실제 편지 데이터(내용/읽음시각/이모지)는 브라우저가 아니라 Vercel KV(Redis)에 저장되므로, 보내는 친구와 받는 친구가 서로 다른 기기로 접속해도 데이터가 공유됩니다.

## 1. GitHub에 올리기

```bash
cd letters
git init
git add .
git commit -m "init: 편지함"
git branch -M main
git remote add origin https://github.com/<your-id>/farewell-letters.git
git push -u origin main
```

## 2. Vercel에 배포하기

1. https://vercel.com 에서 **Add New → Project** → 방금 만든 GitHub 저장소 선택 → Import
   - Framework Preset: **Other** (정적 파일 + `/api` 함수 조합을 Vercel이 자동 인식합니다)
   - Build Command / Output Directory는 비워둬도 됩니다.
2. **Storage 탭 → Create Database → KV(Redis)** 선택 후 이 프로젝트에 Connect
   - 연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 등 필요한 환경변수가 프로젝트에 자동으로 추가됩니다.
3. **Settings → Environment Variables**에서 `PIN_CONFIG` 환경변수를 하나 추가합니다. (아래 3번 참고)
4. Deploy 클릭. 배포가 끝나면 `https://<프로젝트명>.vercel.app` 으로 접속해서 확인합니다.

> 환경변수를 새로 추가/수정한 뒤에는 Vercel에서 **Redeploy**를 한 번 해줘야 반영됩니다.

## 3. 친구들 PIN 설정 (`PIN_CONFIG`)

Vercel 프로젝트 → Settings → Environment Variables 에 `PIN_CONFIG` 라는 이름으로 아래와 같은 **한 줄짜리 JSON 문자열**을 값으로 넣어주세요.

```json
{"1234":{"role":"send","name":"철수"},"2345":{"role":"send","name":"영희"},"3456":{"role":"send","name":"민수"},"9999":{"role":"sent","name":"지민"}}
```

- `role`이 `"send"`면 편지를 쓰는 친구, `"sent"`면 편지를 받는(이민 가는) 친구입니다.
- `"sent"` role은 보통 한 명(이민 가는 친구)만 두면 됩니다. 여러 명을 받는 사람으로 지정하면 모두 같은 편지함을 보게 됩니다.
- PIN, 이름은 원하는 대로 자유롭게 바꿔서 쓰면 됩니다. 실수로 노출돼도 큰 문제 없도록 너무 뻔한 숫자(0000, 1234 등)는 피하는 걸 추천해요.

## 로컬에서 미리 보기 (선택)

```bash
npm i -g vercel
cd letters
vercel link
vercel env pull .env.local     # KV 환경변수 + PIN_CONFIG를 로컬로 가져옴
vercel dev
```

`vercel dev`는 정적 파일 서빙과 `/api` 함수를 로컬에서 동시에 띄워주므로, 실제 배포와 동일한 환경에서 테스트할 수 있습니다.
