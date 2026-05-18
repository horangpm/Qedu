import { useState } from "react";
import "./App.css";

const STEPS = ["프로필", "도서검색", "질문법", "질문생성"];

const QUESTION_METHODS = [
  { id: "swc", label: "SWC 질문", icon: "👁️", desc: "보기 · 궁금해하기 · 연결하기" },
  { id: "qft", label: "QFT 질문", icon: "💡", desc: "스스로 질문 만들고 분류하기" },
  { id: "bloom", label: "Bloom 질문", icon: "🧠", desc: "6단계 사고력 질문" },
  { id: "ib5", label: "IB 5단계 질문", icon: "🌐", desc: "사실적·해석적·개념적·적용적·논쟁적 5단계" },
];

const GRADE_OPTIONS = {
  초등: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
  중등: ["1학년", "2학년", "3학년"],
  고등: ["1학년", "2학년", "3학년"],
  기타: ["기타"],
};

// ── 텍스트 클리닝 필터 (모든 정보에서 *, # 마크다운 기호 제거) ────────────
export function cleanMarkdown(text) {
  if (!text) return "";
  return text
    // 볼드 마크다운 (**) 제거
    .replace(/\*\*/g, "")
    // 개별 별표 (*) 제거
    .replace(/\*/g, "")
    // 샵 (#) 기호 및 헤더 제거
    .replace(/#/g, "")
    // 대괄호 내의 마크다운 기호 파편 제거
    .replace(/\[\s*#+\s*/g, "[")
    // 불필요한 줄바꿈 공백 정리
    .replace(/^[ \t]*[•-][ \t]+/gm, "- ")
    .trim();
}

async function callGemini(prompt, systemPrompt = "", apiKey = "", responseJson = false) {
  if (!apiKey) throw new Error("API 키가 없습니다.");

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt;

  const generationConfig = { maxOutputTokens: 4000, temperature: 0.7 };
  if (responseJson) {
    generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig,
      }),
    }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    const rawErr = data.error?.message || "";
    if (rawErr.toLowerCase().includes("quota") || rawErr.toLowerCase().includes("limit") || response.status === 429) {
      throw new Error("무료 AI 호출 한도(분당 15회)에 일시적으로 도달했습니다. 플랫폼 품질 유지를 위해 약 30초~1분 후 다시 시도해 주시면 마법처럼 즉시 정상 작동합니다! 잠시만 대기해 주세요. 😊");
    }
    throw new Error(rawErr || "API 오류");
  }
  
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  // JSON 응답이 아닐 경우 텍스트에서 *, # 기호를 안전하고 말끔하게 제거하여 반환
  return responseJson ? rawText : cleanMarkdown(rawText);
}

// ── API 키 입력 모달 ────────────────────────────────────
function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const isValid = key.trim().length > 10;

  return (
    <div className="apikey-modal">
      <div className="apikey-box">
        <div className="apikey-icon">✨</div>
        <h3>Google AI 키 입력</h3>
        <p>
          질문 생성과 AI 피드백에 <strong>Google Gemini</strong>를 사용합니다.<br />
          도서 검색은 <strong>무료</strong>입니다! 키는 아래에서 무료로 발급받으세요:
        </p>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="apikey-cta-link"
        >
          🔗 aistudio.google.com → 무료 키 발급
        </a>
        <div className="apikey-input-row" style={{ marginTop: 16 }}>
          <input
            className="input"
            type={show ? "text" : "password"}
            placeholder="AIza..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && onSave(key.trim())}
          />
          <button className="btn btn-outline btn-sm" onClick={() => setShow(s => !s)}>
            {show ? "숨기기" : "보기"}
          </button>
        </div>
        <button
          className="btn btn-primary btn-full"
          onClick={() => onSave(key.trim())}
          disabled={!isValid}
          style={{ marginTop: 12 }}
        >
          시작하기 🚀
        </button>
        <p className="apikey-notice">키는 이 브라우저에만 저장되며 외부로 전송되지 않아요. 투명하게 Gemini API에만 사용됩니다.</p>
      </div>
    </div>
  );
}

// ── 스텝 1: 프로필 ────────────────────────────────────────
function ProfileStep({ profile, setProfile, onNext }) {
  const levels = ["초등", "중등", "고등", "기타"];
  const isValid = profile.role && profile.level && profile.grade;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">👤</span>
        <h2>사용자 설정</h2>
      </div>

      <div className="section">
        <label className="section-label">역할 선택</label>
        <div className="tag-group">
          {["학생", "교사"].map((r) => (
            <button
              key={r}
              className={`tag ${profile.role === r ? "active" : ""}`}
              onClick={() => setProfile((p) => ({ ...p, role: r }))}
            >
              {r === "학생" ? "🎒 학생" : "📚 교사"}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <label className="section-label">학교급</label>
        <div className="tag-group">
          {levels.map((l) => (
            <button
              key={l}
              className={`tag ${profile.level === l ? "active" : ""}`}
              onClick={() => setProfile((p) => ({ ...p, level: l, grade: "" }))}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {profile.level && (
        <div className="section fade-in">
          <label className="section-label">학년</label>
          <div className="tag-group">
            {GRADE_OPTIONS[profile.level].map((g) => (
              <button
                key={g}
                className={`tag ${profile.grade === g ? "active" : ""}`}
                onClick={() => setProfile((p) => ({ ...p, grade: g }))}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={onNext}
        disabled={!isValid}
        style={{ marginTop: 8 }}
      >
        다음 →
      </button>
    </div>
  );
}

// ── 스텝 2: 도서 검색 (Google Books API + Gemini AI 하이브리드) ─────────────────
function BookStep({ book, setBook, profile, onNext, onBack, apiKey }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  async function searchBook() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    setBook(null);
    try {
      let items = [];
      
      // 1단계: Google Books API 3중 하이브리드 시도 (일반검색 -> intitle -> inauthor)
      try {
        items = await fetchBooks(query);
        if (!items || items.length === 0) {
          items = await fetchBooks(`intitle:${query}`);
        }
        if (!items || items.length === 0) {
          items = await fetchBooks(`inauthor:${query}`);
        }
      } catch (booksApiErr) {
        console.warn("Google Books API 차단됨, Gemini 백업 검색 가동:", booksApiErr);
        items = []; // 아래 Gemini 검색으로 넘어가도록 초기화
      }

      // 2단계: Google Books 실패 시 Gemini AI 백업 도서 검색 가동!
      if (!items || items.length === 0) {
        const geminiSearchResult = await callGemini(
          `도서명 또는 검색어 "${query}"에 해당하는 실제 한국어 도서 정보 3권을 찾아 아래 JSON 형식으로만 대답해줘.
          [중요 지침]
          반드시 실제로 존재하는 도서 정보여야 하며, 소설이나 문학 도서의 등장인물 이름(예: "재바우"를 "재빨라"로 잘못 적는 등) 및 책의 세부 정보에 절대로 임의적인 거짓/가짜 정보(환각/Hallucination)가 들어가서는 안 됩니다. 
          등장인물의 역사적/문학적 이름과 정확한 줄거리를 면밀히 백과사전식 교차 검증하여 기록하십시오. 줄거리는 각 책마다 1500자 이내의 상세한 줄거리로 상세하게 요약해 주세요.

          [
            {
              "title": "정확한 책 제목",
              "author": "저자명",
              "genre": "장르",
              "summary": "책의 구체적인 전체 줄거리 (반드시 실제 등장인물의 정밀한 이름과 스토리를 포함한 1500자 이내의 상세 요약)",
              "year": "출판년도",
              "publisher": "출판사"
            }
          ]`,
          "당신은 유능하고 팩트 체크가 철저한 도서 검색 사서입니다. 반드시 규격화된 JSON 대괄호 리스트 배열로만 대답하십시오.",
          apiKey,
          true // JSON 강제 모드 활성화!
        );

        try {
          // 2중 안전장치: 텍스트에서 처음 나오는 '[' 와 마지막 나오는 ']' 사이의 문자열만 추출
          const startIdx = geminiSearchResult.indexOf('[');
          const endIdx = geminiSearchResult.lastIndexOf(']');
          if (startIdx === -1 || endIdx === -1) {
            throw new Error("결과 데이터 포맷 오류");
          }
          const cleanJson = geminiSearchResult.slice(startIdx, endIdx + 1);
          const parsed = JSON.parse(cleanJson);
          
          items = parsed.map((b, idx) => ({
            id: `gemini-book-${idx}-${Date.now()}`,
            volumeInfo: {
              title: b.title,
              authors: [b.author],
              categories: [b.genre],
              description: b.summary,
              publishedDate: b.year,
              publisher: b.publisher,
              imageLinks: null // 표지 이미지가 없으면 기본 책 아이콘 사용
            }
          }));
        } catch (parseErr) {
          console.error("Gemini 도서 파싱 에러:", parseErr, geminiSearchResult);
          throw new Error("도서 정보를 AI로 추출하는 데 실패했습니다. 조금 더 대중적인 책 제목으로 다시 검색해 주세요.");
        }
      }

      if (!items || items.length === 0) {
        setError("도서 정보를 찾지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      const parsed = items.map((item) => {
        const v = item.volumeInfo;
        return {
          id: item.id,
          title: v.title || "제목 없음",
          author: (v.authors || []).join(", ") || "저자 미상",
          genre: (v.categories || ["기타"]).join(", "),
          keywords: (v.categories || []).slice(0, 3).join(", ") || query,
          summary: v.description
            ? v.description.replace(/<[^>]*>/g, "").slice(0, 1500) + (v.description.length > 1500 ? "..." : "")
            : "줄거리 정보가 없습니다.",
          cover: v.imageLinks?.thumbnail?.replace("http://", "https://") || null,
          publisher: v.publisher || "",
          year: v.publishedDate?.slice(0, 4) || "",
          googleLink: item.id.startsWith("gemini-book")
            ? `https://search.naver.com/search.naver?query=${encodeURIComponent(v.title)}`
            : v.infoLink || `https://books.google.com/books?id=${item.id}`,
          characters: "",
          setting: "",
          conflict: "",
          message: "",
          topics: [],
        };
      });

      setResults(parsed);
    } catch (e) {
      setError("도서 검색 중 문제가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBooks(q) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&printType=books&orderBy=relevance`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Google Books API 호출 불가");
    const data = await res.json();
    return data.items || [];
  }

  function selectBook(b) {
    setBook(b);
    setResults([]);
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">📖</span>
        <h2>도서 검색</h2>
      </div>
      <p className="sub-desc" style={{ marginTop: -14, marginBottom: 16 }}>
        Google Books에서 실제 도서를 검색합니다
      </p>

      <div className="search-row">
        <input
          className="input"
          placeholder="도서명 또는 저자 검색 (예: 어린왕자, 김지영...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && searchBook()}
        />
        <button className="btn btn-primary" onClick={searchBook} disabled={loading || !query.trim()}>
          {loading ? "검색중..." : "🔍 검색"}
        </button>
      </div>

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <p>Google Books에서 검색하고 있어요...</p>
        </div>
      )}

      {error && <div className="error-box">⚠️ {error}</div>}

      {/* 검색 결과 목록 */}
      {results.length > 0 && !book && (
        <div className="fade-in">
          <p className="search-count">📚 검색 결과 {results.length}권 — 원하는 책을 선택하세요</p>
          <div className="book-results">
            {results.map((b) => (
              <div key={b.id} className="book-result-card" onClick={() => selectBook(b)}>
                <div className="book-cover-wrap">
                  {b.cover ? (
                    <img src={b.cover} alt={b.title} className="book-cover" />
                  ) : (
                    <div className="book-cover-placeholder">📚</div>
                  )}
                </div>
                <div className="book-result-info">
                  <p className="book-result-title">{b.title}</p>
                  <p className="book-result-author">{b.author}</p>
                  {b.year && <p className="book-result-year">{b.year}년</p>}
                  {b.genre && b.genre !== "기타" && (
                    <span className="book-result-genre">{b.genre.split(",")[0]}</span>
                  )}
                </div>
                <span className="book-select-arrow">›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 책 정보 */}
      {book && (
        <div className="fade-in">
          <div className="book-selected">
            <div className="book-selected-cover">
              {book.cover ? (
                <img src={book.cover} alt={book.title} className="book-cover-lg" />
              ) : (
                <div className="book-cover-placeholder-lg">📚</div>
              )}
            </div>
            <div className="book-selected-info">
              <h3 className="book-selected-title">{book.title}</h3>
              <p className="book-selected-author">✍️ {book.author}</p>
              {book.year && <p className="book-selected-year">📅 {book.year}년{book.publisher ? ` · ${book.publisher}` : ""}</p>}
              {book.genre && book.genre !== "기타" && (
                <div className="keyword-group" style={{ marginTop: 8 }}>
                  {book.genre.split(",").slice(0, 3).map((g, i) => (
                    <span key={i} className="keyword">{g.trim()}</span>
                  ))}
                </div>
              )}
              <a
                href={book.googleLink}
                target="_blank"
                rel="noreferrer"
                className="google-books-link"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 Google Books에서 보기
              </a>
            </div>
          </div>

          {book.summary && book.summary !== "줄거리 정보가 없습니다." && (
            <div className="book-summary-box">
              <p className="book-summary-label">📝 책 소개</p>
              <p className="book-summary">{book.summary}</p>
            </div>
          )}

          <button
            className="btn btn-outline btn-full"
            onClick={() => { setBook(null); setResults([]); }}
            style={{ marginTop: 10, marginBottom: 4 }}
          >
            🔄 다른 책 선택
          </button>
          <p className="ai-notice">📡 Google Books 실제 데이터입니다.</p>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 16 }}>
        <button className="btn btn-outline" onClick={onBack}>← 이전</button>
        <button className="btn btn-primary flex-1" onClick={onNext} disabled={!book}>
          이 책으로 질문 만들기 →
        </button>
      </div>
    </div>
  );
}

// ── 스텝 3: 질문법 선택 ───────────────────────────────────
function MethodStep({ method, setMethod, onNext, onBack }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">🧩</span>
        <h2>질문법 선택</h2>
      </div>
      <p className="sub-desc">하나를 선택해 AI가 질문을 생성합니다</p>

      <div className="method-list">
        {QUESTION_METHODS.map((m) => (
          <div
            key={m.id}
            className={`method-card ${method === m.id ? "selected" : ""}`}
            onClick={() => setMethod(m.id)}
          >
            <span className="method-icon">{m.icon}</span>
            <div className="method-info">
              <p className="method-name">{m.label}</p>
              <p className="method-desc">{m.desc}</p>
            </div>
            {method === m.id && <span className="check-mark">✓</span>}
          </div>
        ))}
      </div>

      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn btn-outline" onClick={onBack}>← 이전</button>
        <button className="btn btn-primary flex-1" onClick={onNext} disabled={!method}>
          질문 생성하기 →
        </button>
      </div>
    </div>
  );
}

// ── 스텝 4: 질문 생성 & AI 피드백 ────────────────────────
function QuestionStep({ book, method, profile, onBack, apiKey }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myQ, setMyQ] = useState("");
  const [feedback, setFeedback] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [error, setError] = useState("");

  const levelHint =
    profile.level === "초등" ? `초등 ${profile.grade} 수준의 쉬운 말로`
    : profile.level === "중등" ? `중학생 ${profile.grade} 수준으로`
    : `고등학생 ${profile.grade} 수준으로`;

  const methodPrompts = {
    swc: `도서 "${book.title}"을 기반으로 SWC 질문법(See·Wonder·Connect)에 따라 ${levelHint} 각 단계별 질문 2개씩 만들어줘.

형식:
[See - 보기]
1.
2.

[Wonder - 궁금해하기]
1.
2.

[Connect - 연결하기]
1.
2.`,
    qft: `도서 "${book.title}"을 기반으로 QFT 질문법에 따라 ${levelHint} 아래 형식으로 질문 10개를 만들어줘.

[질문 초점]
(이 책에서 가장 생각해볼 만한 장면이나 문장 1개 제시)

[브레인스토밍 질문 10개]
1. (느낌질문)
2. (비교질문)
3. (상상/IF질문)
4. (흥미/Why질문)
5. (유추질문)
6. (문제해결질문)
7. (메타인지질문)
8.
9.
10.`,
    bloom: `도서 "${book.title}"을 기반으로 블룸의 6단계 질문법에 따라 ${levelHint} 각 단계별 질문 2개씩 만들어줘.

[1단계 기억] - 사실 확인
1.
2.

[2단계 이해] - 내용 파악
1.
2.

[3단계 적용] - 내 삶에 연결
1.
2.

[4단계 분석] - 비교·분석
1.
2.

[5단계 평가] - 가치 판단
1.
2.

[6단계 창조] - 새롭게 만들기
1.
2.`,
    ib5: `도서 "${book.title}"을 기반으로 IB 5단계 통합 질문법에 따라 ${levelHint} 아래 5개 단계별로 질문을 각각 2개씩 만들어줘.

[1단계 사실적 질문] - 책의 내용과 객관적 사실을 확인하는 질문
1.
2.

[2단계 해석적 질문] - 행간의 숨겨진 의미와 인물의 행동 원인을 추론하는 질문
1.
2.

[3단계 개념적 질문] - 책의 주제를 보편적 가치나 더 큰 개념으로 확장하는 질문
1.
2.

[4단계 적용적 질문] - 책에서 얻은 깨달음을 내 삶이나 현대 사회에 대입해 보는 질문
1.
2.

[5단계 논쟁적 질문] - 정해진 답 없이 다양한 시선으로 토론할 수 있는 찬반/가치 판단 질문
1.
2.`,
  };

  async function generateQuestions() {
    setLoading(true);
    setError("");
    setQuestions(null);
    try {
      const bookContext = `[도서 팩트 정보]
- 도서명: ${book.title}
- 저자: ${book.author}
- 장르: ${book.genre}
- 줄거리: ${book.summary}

위 도서의 실제 스토리와 실존하는 등장인물 이름(주인공 이름 등)에 절대적으로 입각하여, 아래 질문 생성 요청을 한 치의 왜곡 없이 신뢰성 있게 처리해 주세요:

`;

      const result = await callGemini(
        bookContext + methodPrompts[method],
        "당신은 참여형 독서교육 및 질문교육 전문가 함선미입니다. [중요 출력 규칙] 답변의 첫 번째 줄(첫 문장)은 무조건 \"안녕하세요! 참여형 독서교육 및 질문교육 전문가 함선미입니다.\" 라는 인사말 하나로만 완벽히 끝맺어야 합니다. 인사말 바로 뒤에는 어떠한 부연 설명이나 특수 기호도 덧붙이지 마십시오. 인사말이 끝나자마자 즉시 줄바꿈(엔터)을 2회 적용하여 문단을 분리한 뒤, 새로운 다음 줄부터 교육학적으로 정교하고 사실에 입각한 질문 본문을 생성해 주세요.",
        apiKey
      );
      setQuestions(result);
    } catch (e) {
      setError("질문 생성 중 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function getAiFeedback() {
    if (!myQ.trim()) return;
    setFbLoading(true);
    setFeedback("");
    try {
      const bookContext = `[도서 팩트 정보]
- 도서명: ${book.title}
- 저자: ${book.author}
- 장르: ${book.genre}
- 줄거리: ${book.summary}

`;

      const result = await callGemini(
        bookContext + `위 도서 정보를 바탕으로, 실제 줄거리와 실존 등장인물 팩트에 완벽히 일치시켜 학생이 만든 아래 독서 질문을 면밀히 분석해줘.

학생 질문: "${myQ}"
학생 수준: ${profile.level} ${profile.grade}

아래 형식으로 피드백 해줘:

[질문 유형] 사실적/해석적/개념적/적용적/논쟁적 중 해당하는 것
[사고 수준] 블룸의 6단계 중 해당하는 것
[잘된 점] 이 질문의 강점 1~2가지
[개선 제안] 더 좋은 질문이 되려면 어떻게 바꿀 수 있는지 구체적으로
[업그레이드 질문] 개선된 버전 질문 1개`,
        "당신은 따뜻하고 격려를 아끼지 않는 참여형 독서교육 및 질문교육 전문가 함선미입니다. [중요 출력 규칙] 답변의 첫 번째 줄(첫 문장)은 무조건 \"안녕하세요! 참여형 독서교육 및 질문교육 전문가 함선미입니다.\" 라는 인사말 하나로만 완벽히 끝맺어야 합니다. 인사말 바로 뒤에는 어떠한 부연 설명이나 특수 기호도 덧붙이지 마십시오. 인사말이 끝나자마자 즉시 줄바꿈(엔터)을 2회 적용하여 문단을 분리한 뒤, 새로운 다음 줄부터 학생의 질문 분석 및 피드백 본문을 친절하게 진행해 주세요.",
        apiKey
      );
      setFeedback(result);
    } catch (e) {
      setFeedback("피드백 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      setFbLoading(false);
    }
  }

  const methodName = QUESTION_METHODS.find((m) => m.id === method)?.label;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">✨</span>
        <h2>{methodName} — {book.title}</h2>
      </div>
      <p className="sub-desc">{profile.level} {profile.grade} · {profile.role}</p>

      {!questions && !loading && (
        <button className="btn btn-primary btn-full btn-large" onClick={generateQuestions}>
          🎯 AI 질문 생성하기
        </button>
      )}

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <p>AI가 질문을 만들고 있어요...</p>
        </div>
      )}

      {error && (
        <div className="error-box">
          ⚠️ {error}
          <button className="btn btn-danger btn-sm" onClick={generateQuestions} style={{ marginLeft: 12 }}>
            재시도
          </button>
        </div>
      )}

      {questions && (
        <div className="fade-in">
          <div className="ai-box">{questions}</div>
          <p className="ai-notice">⚠️ AI가 생성한 질문입니다. 직접 수정·활용해 보세요.</p>
          <button className="btn btn-green btn-full" onClick={generateQuestions} style={{ marginTop: 8 }}>
            🔄 다시 생성
          </button>
        </div>
      )}

      {/* 내 질문 AI 피드백 */}
      <div className="feedback-section">
        <h3 className="feedback-title">💬 내 질문 AI 피드백 받기</h3>
        <p className="feedback-desc">직접 만든 질문을 입력하면 AI가 분석·개선 방향을 알려줍니다.</p>
        <textarea
          className="input textarea"
          placeholder="여기에 내가 만든 질문을 써보세요..."
          value={myQ}
          onChange={(e) => setMyQ(e.target.value)}
        />
        <button
          className="btn btn-orange btn-full"
          onClick={getAiFeedback}
          disabled={fbLoading || !myQ.trim()}
          style={{ marginTop: 10 }}
        >
          {fbLoading ? "분석 중..." : "📊 AI 피드백 받기"}
        </button>

        {fbLoading && (
          <div className="loading-box loading-orange">
            <div className="spinner spinner-orange" />
            <p>질문을 분석하고 있어요...</p>
          </div>
        )}

        {feedback && (
          <div className="ai-box ai-box-orange fade-in">{feedback}</div>
        )}
      </div>

      <button className="btn btn-outline btn-full" onClick={onBack} style={{ marginTop: 20 }}>
        ← 질문법 다시 선택
      </button>
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ role: "", level: "", grade: "" });
  const [book, setBook] = useState(null);
  const [method, setMethod] = useState("");
  const [apiKey, setApiKey] = useState(
    () => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || ""
  );

  function handleSaveKey(key) {
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
  }

  // API 키가 없으면 입력 모달 표시
  if (!apiKey) {
    return <ApiKeyModal onSave={handleSaveKey} />;
  }

  return (
    <div className="app-wrap">
      {/* 헤더 */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">🌱</span>
          <div>
            <div className="header-title">질문의 씨앗</div>
            <div className="header-sub">AI 기반 질문교육 플랫폼</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {step > 0 && (
            <div className="header-profile">
              {profile.role} · {profile.level} {profile.grade}
            </div>
          )}
          <button
            className="header-key-btn"
            onClick={() => { localStorage.removeItem("gemini_api_key"); setApiKey(""); }}
            title="API 키 변경"
          >
            🔑
          </button>
        </div>
      </header>

      {/* 진행 표시 */}
      <div className="step-bar">
        {STEPS.map((s, i) => (
          <div key={s} className="step-item">
            <div className={`step-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} />
            {i < STEPS.length - 1 && (
              <div className={`step-line ${i < step ? "done" : ""}`} />
            )}
          </div>
        ))}
      </div>
      <p className="step-label">{STEPS[step]}</p>

      {/* 스텝 렌더링 */}
      <div className="step-content">
        {step === 0 && (
          <ProfileStep profile={profile} setProfile={setProfile} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <BookStep book={book} setBook={setBook} profile={profile} onNext={() => setStep(2)} onBack={() => setStep(0)} apiKey={apiKey} />
        )}
        {step === 2 && (
          <MethodStep method={method} setMethod={setMethod} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <QuestionStep book={book} method={method} profile={profile} onBack={() => setStep(2)} apiKey={apiKey} />
        )}
      </div>
      
      {/* 하단 저작권 문장 */}
      <footer className="app-footer">
        Copyright © 2026. 담연에듀연구소 함선미 All rights reserved.
      </footer>
    </div>
  );
}
