"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Check, Volume2, Minimize2, Star } from "lucide-react";

// ─── CONSTANTS ───────────────────────────────────────────────────
const LANGUAGES = [
  { code: "auto", label: "Auto",        flag: "🔍" },
  { code: "ko",   label: "한국어",       flag: "🇰🇷" },
  { code: "en",   label: "English",     flag: "🇺🇸" },
  { code: "ja",   label: "日本語",       flag: "🇯🇵" },
  { code: "zh",   label: "中文",         flag: "🇨🇳" },
  { code: "es",   label: "Español",     flag: "🇪🇸" },
  { code: "fr",   label: "Français",    flag: "🇫🇷" },
  { code: "de",   label: "Deutsch",     flag: "🇩🇪" },
  { code: "th",   label: "ไทย",         flag: "🇹🇭" },
  { code: "vi",   label: "Tiếng Việt",  flag: "🇻🇳" },
];
const TARGET_LANGS = LANGUAGES.filter(l => l.code !== "auto");

const TONES = [
  { id: "polite",    label: "Polite" },
  { id: "casual",    label: "Casual" },
  { id: "formal",    label: "Formal" },
  { id: "message",   label: "Message" },
  { id: "groupchat", label: "Group Chat" },
];

const C = {
  bg: "#111112", surface: "#1c1c1e", surface2: "#242426",
  border: "#2a2a2c", borderActive: "#4a4a4e",
  text: "#f2f2f7", textSub: "#8e8e93", textMuted: "#48484a",
  tag: "#242426", tagActive: "#333336",
};
const font = "'Inter','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
const spinnerCSS = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`;

// ─── STORAGE ─────────────────────────────────────────────────────
const STORAGE_KEY = "madi_state_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveState(state: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function useDebouncedStorage(state: any, ready: boolean) {
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (!ready) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveState(state), 500);
    return () => clearTimeout(timerRef.current);
  }, [state, ready]);
}

// ─── API — calls our server route, Gemini key stays hidden ───────
async function callAPI(prompt: string, max_tokens = 900): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, max_tokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data.text;
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────
function Spinner({ size = 14, color = "#8e8e93" }: { size?: number; color?: string }) {
  return (
    <span style={{ display:"inline-block", width:size, height:size, border:"2px solid transparent", borderTopColor:color, borderRightColor:color, borderRadius:"50%", animation:"spin 0.7s linear infinite", verticalAlign:"middle" }} />
  );
}

const iconBtnStyle: React.CSSProperties = {
  width:32, height:32, borderRadius:7, border:"none",
  background:"none", cursor:"pointer", display:"flex", alignItems:"center",
  justifyContent:"center", flexShrink:0, padding:0,
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} title="Copy" style={{ ...iconBtnStyle, color: copied ? C.text : C.textMuted }}>
      {copied ? <Check size={18} strokeWidth={2} /> : <Copy size={18} strokeWidth={1.5} />}
    </button>
  );
}

const VOICE_PREFS: Record<string, string[]> = {
  en: ["Google US English","Samantha","Karen","en-US","en-GB"],
  ko: ["Google 한국의","Yuna","ko-KR"],
  ja: ["Google 日本語","Kyoko","Otoya","ja-JP"],
  zh: ["Google 普通话","Tingting","zh-CN","zh-TW"],
  es: ["Google español","Monica","es-ES","es-MX"],
  fr: ["Google français","Amelie","fr-FR"],
  de: ["Google Deutsch","Anna","de-DE"],
  th: ["Google ภาษาไทย","th-TH"],
  vi: ["Google Tiếng Việt","vi-VN"],
};
const voiceCache: Record<string, SpeechSynthesisVoice> = {};

function getBestVoice(lang: string) {
  if (voiceCache[lang]) return voiceCache[lang];
  const voices = window.speechSynthesis.getVoices();
  const prefs = VOICE_PREFS[lang] || [];
  for (const pref of prefs) {
    const v = voices.find(v => v.name.includes(pref) || v.lang === pref);
    if (v) { voiceCache[lang] = v; return v; }
  }
  const fallback = voices.find(v => v.lang.startsWith(lang));
  if (fallback) { voiceCache[lang] = fallback; return fallback; }
  return null;
}

function speakWithBestVoice(text: string, lang: string) {
  const s = window.speechSynthesis;
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 0.92; u.pitch = 1.0;
  const trySpeak = () => { const v = getBestVoice(lang); if (v) u.voice = v; s.speak(u); };
  if (s.getVoices().length === 0) { s.onvoiceschanged = () => { trySpeak(); s.onvoiceschanged = null; }; }
  else trySpeak();
}

function PlayBtn({ text, lang }: { text: string; lang: string }) {
  const handle = useCallback(() => speakWithBestVoice(text, lang), [text, lang]);
  return <button onClick={handle} title="Listen" style={{ ...iconBtnStyle, color:C.textMuted }}><Volume2 size={18} strokeWidth={1.5} /></button>;
}

function StarBtn({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={active ? "Unfavorite" : "Favorite"} style={{ ...iconBtnStyle, color: active ? "#e6a817" : C.textMuted }}>
      <Star size={18} strokeWidth={1.5} fill={active ? "#e6a817" : "none"} />
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background:C.surface, borderRadius:10, border:`1px solid ${C.border}`, padding:"12px 14px" }}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.textMuted, marginBottom:8, fontFamily:font }}>{children}</div>;
}

const selectStyle: React.CSSProperties = { background:C.tag, border:`1px solid ${C.border}`, borderRadius:6, color:C.textSub, fontSize:11, padding:"5px 7px", fontFamily:font, cursor:"pointer", flexShrink:0, outline:"none" };
const chipStyle: React.CSSProperties   = { padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:font, whiteSpace:"nowrap", flexShrink:0 };
const smallBtn: React.CSSProperties   = { padding:"3px 9px", borderRadius:5, border:`1px solid ${C.border}`, background:C.tag, color:C.textSub, fontSize:10, fontFamily:font, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 };

// ─── TRANSLATE TAB ───────────────────────────────────────────────
function TranslateTab({ history, setHistory, pendingLoad, setPendingLoad, customTones, setCustomTones, favSet, toggleFavorite }: any) {
  const [inputText,   setInputText]   = useState("");
  const [sourceLang,  setSourceLang]  = useState("auto");
  const [targetLang,  setTargetLang]  = useState("en");
  const [tone,        setTone]        = useState("polite");
  const [result,      setResult]      = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [shortenLoad, setShortenLoad] = useState(false);
  const [showAddTone, setShowAddTone] = useState(false);
  const [newToneName, setNewToneName] = useState("");
  const [listening,   setListening]   = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const resultTopRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pendingLoad) return;
    setInputText(pendingLoad.inputText);
    setTargetLang(pendingLoad.targetLang);
    setTone(pendingLoad.tone || "polite");
    setResult(pendingLoad);
    setPendingLoad(null);
  }, [pendingLoad]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Voice input is not supported in this browser.");
    const r = new SR();
    r.lang = sourceLang === "auto" ? "ko-KR" : sourceLang;
    r.continuous = false; r.interimResults = false;
    r.onstart  = () => setListening(true);
    r.onresult = (e: any) => setInputText(e.results[0][0].transcript);
    r.onend    = () => setListening(false);
    r.onerror  = () => setListening(false);
    recognitionRef.current = r; r.start();
  };
  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true); setResult(null);
    setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
    const allTones = [...TONES, ...customTones];
    const to = allTones.find((t: any) => t.id === tone);
    const srcHint = sourceLang !== "auto" ? `Input lang:${LANGUAGES.find(l => l.code === sourceLang)?.label}.` : "";
    const prompt = `Translate for MADI. JSON only, no markdown.
Input:"${inputText}" To:${targetLang} Tone:${to?.label} ${srcHint}
ROM=target-lang pronunciation in input-lang script
{"dl":"<lang in Korean>","dlc":"<ISO>","t":"<translation>","r":"<rom>","rp":[{"t":"<reply1>","r":"<rom>","m":"<meaning>"},{"t":"<reply2>","r":"<rom>","m":"<meaning>"},{"t":"<reply3>","r":"<rom>","m":"<meaning>"}],"v":[{"w":"<word>","m":"<meaning>","r":"<rom>"},{"w":"","m":"","r":""},{"w":"","m":"","r":""},{"w":"","m":"","r":""}]}`;
    try {
      const raw = await callAPI(prompt);
      const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const ts = Date.now();
      const dateStr = new Date(ts).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
      const mapped = {
        detectedLang: p.dl, detectedLangCode: p.dlc,
        translation: p.t, romanization: p.r,
        replies:    (p.rp||[]).map((x: any) => ({ text:x.t, romanization:x.r, meaning:x.m })),
        vocabulary: (p.v||[]).filter((x: any) => x.w).map((x: any) => ({ word:x.w, meaning:x.m, romanization:x.r })),
        inputText, targetLang, tone, timestamp: ts, dateStr,
      };
      setResult(mapped);
      setHistory((h: any[]) => [mapped, ...h].slice(0, 30));
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (e: any) {
      setResult({ error: e.message });
    } finally { setLoading(false); }
  };

  const handleShorten = async () => {
    if (!result?.translation) return;
    setShortenLoad(true);
    const to = [...TONES, ...customTones].find((t: any) => t.id === tone);
    const prompt = `Shorten this ${targetLang} text, same tone (${to?.label}). JSON only.
"${result.translation}" ROM in ${result.detectedLang} script
{"t":"<shorter>","r":"<rom>"}`;
    try {
      const raw = await callAPI(prompt, 150);
      const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setResult((prev: any) => {
        const updated = { ...prev, translation:p.t, romanization:p.r };
        setHistory((h: any[]) => h.map(item => item.timestamp === prev.timestamp ? updated : item));
        return updated;
      });
    } catch (e) {} finally { setShortenLoad(false); }
  };

  const addCustomTone = () => {
    if (!newToneName.trim()) return;
    const id = "custom_" + Date.now();
    setCustomTones((prev: any[]) => [...prev, { id, label:newToneName.trim() }]);
    setTone(id); setNewToneName(""); setShowAddTone(false);
  };

  const allTones = [...TONES, ...customTones];
  const canVoice = sourceLang !== "auto";
  const isFav    = result ? favSet.has(result.timestamp) : false;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 16px" }}>
        <div ref={resultTopRef} />
        {!result && !loading && <div style={{ textAlign:"center", color:C.textMuted, fontSize:13, marginTop:48 }}>Enter a sentence below<br />and tap Translate</div>}
        {loading && <div style={{ textAlign:"center", color:C.textSub, fontSize:13, marginTop:48 }}><Spinner size={20} /><br /><span style={{ marginTop:10, display:"block" }}>Translating...</span></div>}
        {result?.error && <div style={{ background:"#1a1014", border:"1px solid #3d2028", borderRadius:8, padding:"10px 12px" }}><div style={{ color:"#d06070", fontSize:12 }}>⚠️ {result.error}</div></div>}
        {result && !result.error && (
          <div style={{ display:"flex", flexDirection:"column", gap:8, animation:"fadeIn 0.25s ease" }}>
            <Card>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <SectionLabel>Translation</SectionLabel>
                <div style={{ display:"flex", gap:2, alignItems:"center" }}>
                  <button onClick={handleShorten} disabled={shortenLoad} title="Shorten" style={{ ...iconBtnStyle, color:C.textMuted }}>
                    {shortenLoad ? <Spinner size={10} color={C.textMuted}/> : <Minimize2 size={18} strokeWidth={1.5} />}
                  </button>
                  <CopyBtn text={result.translation} />
                  <StarBtn active={isFav} onToggle={() => toggleFavorite(result)} />
                </div>
              </div>
              <div style={{ fontSize:17, fontWeight:600, lineHeight:1.5, marginBottom:4 }}>{result.translation}</div>
              <div style={{ fontSize:12, color:C.textSub, marginBottom:10 }}>{result.romanization}</div>
              <PlayBtn text={result.translation} lang={targetLang} />
            </Card>

            <Card>
              <SectionLabel>Suggested Replies</SectionLabel>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {result.replies?.map((r: any, i: number) => (
                  <div key={i} style={{ background:C.bg, borderRadius:8, padding:"10px 12px", border:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, marginBottom:2, lineHeight:1.45 }}>{r.text}</div>
                        <div style={{ fontSize:11, color:C.textSub, marginBottom:2 }}>{r.romanization}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{r.meaning}</div>
                      </div>
                      <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                        <CopyBtn text={r.text} />
                        <PlayBtn text={r.text} lang={targetLang} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Vocabulary</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {result.vocabulary?.map((v: any, i: number) => (
                  <div key={i} style={{ background:C.bg, borderRadius:8, padding:"9px 11px", border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:1 }}>{v.word}</div>
                    <div style={{ fontSize:10, color:C.textSub, marginBottom:3 }}>{v.romanization}</div>
                    <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.4 }}>{v.meaning}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, background:C.bg, padding:"8px 12px 10px" }}>
        <div style={{ display:"flex", gap:5, marginBottom:7, overflowX:"auto", alignItems:"center" }}>
          {allTones.map((t: any) => (
            <button key={t.id} onClick={() => setTone(t.id)} style={{ ...chipStyle, fontWeight:tone===t.id?600:400, border:`1px solid ${tone===t.id?C.borderActive:C.border}`, background:tone===t.id?C.tagActive:C.tag, color:tone===t.id?C.text:C.textSub }}>{t.label}</button>
          ))}
          <button onClick={() => setShowAddTone(v => !v)} style={{ ...chipStyle, border:`1px solid ${showAddTone?C.borderActive:C.border}`, background:showAddTone?C.tagActive:C.tag, color:C.textSub, padding:"4px 9px" }}>+</button>
        </div>
        {showAddTone && (
          <div style={{ display:"flex", gap:6, marginBottom:7, alignItems:"center" }}>
            <input value={newToneName} onChange={e => setNewToneName(e.target.value)} placeholder="Add custom tone (e.g. Business email)" style={{ flex:1, background:C.surface, border:`1px solid ${C.borderActive}`, borderRadius:6, color:C.text, fontSize:12, padding:"5px 9px", fontFamily:font, outline:"none" }} onKeyDown={e => { if (e.key==="Enter") addCustomTone(); }} />
            <button onClick={addCustomTone} style={{ ...smallBtn, padding:"5px 10px" }}>Add</button>
          </div>
        )}
        <div style={{ display:"flex", gap:6, marginBottom:7, alignItems:"center" }}>
          <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={selectStyle}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
          <span style={{ color:C.textMuted, fontSize:13, flexShrink:0 }}>→</span>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={selectStyle}>
            {TARGET_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"8px 10px" }}>
          <textarea ref={textareaRef} value={inputText} onChange={handleInput} placeholder="Enter text to translate..." rows={1} style={{ flex:1, background:"transparent", border:"none", outline:"none", color:C.text, fontSize:15, lineHeight:1.5, resize:"none", fontFamily:font, minHeight:24, maxHeight:120, overflowY:"auto" }} onKeyDown={e => { if (e.key==="Enter" && (e.metaKey||e.ctrlKey)) handleTranslate(); }} />
          <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            {canVoice && (
              <button onClick={listening ? stopVoice : startVoice} style={{ width:32, height:32, borderRadius:"50%", border:`1px solid ${listening?"#c06060":C.border}`, background:listening?"#2a1818":C.tag, color:listening?"#e06070":C.textSub, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {listening ? "⏹" : "🎙"}
              </button>
            )}
            <button onClick={handleTranslate} disabled={loading||!inputText.trim()} style={{ width:32, height:32, borderRadius:"50%", border:"none", background:loading||!inputText.trim()?C.surface2:C.text, color:loading||!inputText.trim()?C.textMuted:C.bg, fontSize:14, cursor:loading||!inputText.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {loading ? <Spinner size={13} color={C.textMuted}/> : "↑"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCRIPT TAB ──────────────────────────────────────────────────
function ScriptLine({ line, targetLang }: any) {
  const isA = line.speaker === "A";
  return (
    <div style={{ display:"flex", flexDirection:isA?"row":"row-reverse", gap:8, alignItems:"flex-end" }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, minWidth:14, textAlign:"center", paddingBottom:2 }}>{line.speaker}</div>
      <div style={{ maxWidth:"80%", background:isA?C.surface:C.surface2, borderRadius:isA?"12px 12px 12px 4px":"12px 12px 4px 12px", border:`1px solid ${C.border}`, padding:"10px 12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, color:C.text, marginBottom:3, lineHeight:1.45 }}>{line.target}</div>
            <div style={{ fontSize:11, color:C.textSub, marginBottom:2 }}>{line.rom}</div>
            <div style={{ fontSize:11, color:C.textMuted }}>{line.meaning}</div>
          </div>
          <div style={{ display:"flex", gap:2, flexShrink:0 }}>
            <CopyBtn text={line.target} />
            <PlayBtn text={line.target} lang={targetLang} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptTab() {
  const [topic,       setTopic]       = useState("");
  const [sourceLang,  setSourceLang]  = useState("ko");
  const [targetLang,  setTargetLang]  = useState("en");
  const [title,       setTitle]       = useState("");
  const [lines,       setLines]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setLines([]); setTitle("");
    const sl = LANGUAGES.find(l => l.code === sourceLang);
    const tl = TARGET_LANGS.find(l => l.code === targetLang);
    const prompt = `Conversation script for: "${topic}"
Src:${sl?.label}(${sourceLang}) Tgt:${tl?.label}(${targetLang})
ROM=target pronunciation in source script. 6-8 lines A/B alternating. JSON only:
{"title":"<title in src lang>","lines":[{"speaker":"A","target":"<line>","rom":"<rom>","meaning":"<src meaning>"}]}`;
    try {
      const raw = await callAPI(prompt, 1000);
      const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setTitle(p.title || ""); setLines(p.lines || []); setTopic("");
    } catch (e: any) {
      setLines([{ error: e.message }]);
    } finally { setLoading(false); }
  };

  const handleLoadMore = async () => {
    if (!lines.length) return;
    setMoreLoading(true);
    const sl = LANGUAGES.find(l => l.code === sourceLang);
    const tl = TARGET_LANGS.find(l => l.code === targetLang);
    const context = lines.map((l: any) => `${l.speaker}: ${l.target}`).join("\n");
    const lastSpeaker = lines[lines.length - 1]?.speaker || "A";
    const nextSpeaker = lastSpeaker === "A" ? "B" : "A";
    const prompt = `Continue this conversation naturally. 4-6 more lines.
Context:\n${context}\nNext speaker: ${nextSpeaker}.
Src:${sl?.label}(${sourceLang}) Tgt:${tl?.label}(${targetLang})
ROM=target pronunciation in source script. JSON only:
{"lines":[{"speaker":"A or B","target":"<line>","rom":"<rom>","meaning":"<src meaning>"}]}`;
    try {
      const raw = await callAPI(prompt, 800);
      const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setLines(prev => [...prev, ...(p.lines || [])]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 80);
    } catch (e) {} finally { setMoreLoading(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 16px" }}>
        {!lines.length && !loading && <div style={{ textAlign:"center", color:C.textMuted, fontSize:13, marginTop:48 }}>Describe the situation<br />you want a script for</div>}
        {loading && <div style={{ textAlign:"center", color:C.textSub, fontSize:13, marginTop:48 }}><Spinner size={20}/><br /><span style={{ marginTop:10, display:"block" }}>Generating script...</span></div>}
        {lines.length > 0 && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            {title && <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:14 }}>{title}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {lines.map((line: any, i: number) =>
                line.error
                  ? <div key={i} style={{ background:"#1a1014", border:"1px solid #3d2028", borderRadius:8, padding:"10px 12px" }}><div style={{ color:"#d06070", fontSize:12 }}>⚠️ {line.error}</div></div>
                  : <ScriptLine key={i} line={line} targetLang={targetLang} />
              )}
            </div>
            <div ref={bottomRef} style={{ marginTop:16, display:"flex", justifyContent:"center" }}>
              <button onClick={handleLoadMore} disabled={moreLoading} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:moreLoading?C.surface2:C.surface, color:moreLoading?C.textMuted:C.textSub, fontSize:12, fontFamily:font, cursor:moreLoading?"not-allowed":"pointer" }}>
                {moreLoading ? <><Spinner size={11} color={C.textMuted}/> Generating...</> : "↓ Load more"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ borderTop:`1px solid ${C.border}`, background:C.bg, padding:"8px 12px 10px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:7, alignItems:"center" }}>
          <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={selectStyle}>
            {TARGET_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
          <span style={{ color:C.textMuted, fontSize:13, flexShrink:0 }}>→</span>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={selectStyle}>
            {TARGET_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"8px 10px" }}>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Buying at a Japanese convenience store..." rows={1} style={{ flex:1, background:"transparent", border:"none", outline:"none", color:C.text, fontSize:15, lineHeight:1.5, resize:"none", fontFamily:font, minHeight:24, maxHeight:120 }} onKeyDown={e => { if (e.key==="Enter" && (e.metaKey||e.ctrlKey)) handleGenerate(); }} />
          <button onClick={handleGenerate} disabled={loading||!topic.trim()} style={{ width:32, height:32, borderRadius:"50%", border:"none", background:loading||!topic.trim()?C.surface2:C.text, color:loading||!topic.trim()?C.textMuted:C.bg, fontSize:14, cursor:loading||!topic.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {loading ? <Spinner size={13} color={C.textMuted}/> : "↑"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY TAB ─────────────────────────────────────────────────
function HistoryTab({ history, setHistory, onReuse, favSet, toggleFavorite }: any) {
  const [selected,  setSelected]  = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");
  const favorites = history.filter((h: any) => favSet.has(h.timestamp));

  if (selected) {
    const r = selected;
    const isFav = favSet.has(r.timestamp);
    return (
      <div style={{ height:"100%", overflowY:"auto", padding:"12px 16px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
          <button onClick={() => setSelected(null)} style={smallBtn}>← Back</button>
          <button onClick={() => onReuse(r)} style={{ ...smallBtn, color:C.text, borderColor:C.borderActive }}>↩ Translate again</button>
          <button onClick={() => toggleFavorite(r)} style={{ ...smallBtn, marginLeft:"auto", color:isFav?"#e6a817":C.textMuted, borderColor:isFav?"#6b4f10":C.border, background:isFav?"#2a2010":C.tag }}>
            {isFav ? "★ Saved" : "☆ Favorite"}
          </button>
        </div>
        <div style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>{r.dateStr}</div>
        <div style={{ fontSize:13, color:C.textSub, marginBottom:14, background:C.surface, borderRadius:8, padding:"10px 12px", border:`1px solid ${C.border}` }}>{r.inputText}</div>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <SectionLabel>Translation</SectionLabel>
            <CopyBtn text={r.translation} />
          </div>
          <div style={{ fontSize:17, fontWeight:600, lineHeight:1.5, marginBottom:4 }}>{r.translation}</div>
          <div style={{ fontSize:12, color:C.textSub, marginBottom:10 }}>{r.romanization}</div>
          <PlayBtn text={r.translation} lang={r.targetLang} />
        </Card>
        <div style={{ height:8 }} />
        <Card>
          <SectionLabel>Suggested Replies</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {r.replies?.map((rep: any, i: number) => (
              <div key={i} style={{ background:C.bg, borderRadius:8, padding:"10px 12px", border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, marginBottom:2 }}>{rep.text}</div>
                    <div style={{ fontSize:11, color:C.textSub, marginBottom:2 }}>{rep.romanization}</div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{rep.meaning}</div>
                  </div>
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    <CopyBtn text={rep.text} />
                    <PlayBtn text={rep.text} lang={r.targetLang} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const displayList = activeTab === "favorites" ? favorites : history;
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        {[{id:"all",label:`All ${history.length}`},{id:"favorites",label:`★ Favorites ${favorites.length}`}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:1, padding:"10px 0", border:"none", background:"transparent", fontFamily:font, fontSize:12, cursor:"pointer", color:activeTab===t.id?C.text:C.textMuted, fontWeight:activeTab===t.id?600:400, borderBottom:`2px solid ${activeTab===t.id?C.text:"transparent"}` }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        {displayList.length === 0 ? (
          <div style={{ textAlign:"center", color:C.textMuted, fontSize:13, marginTop:48 }}>
            {activeTab==="favorites" ? "No favorites yet" : "No translation history yet"}
            {activeTab==="favorites" && <div style={{ fontSize:12, marginTop:6 }}>Tap ☆ on any translation to save it</div>}
          </div>
        ) : (
          <>
            {activeTab==="all" && <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}><button onClick={() => setHistory([])} style={{ ...smallBtn, color:"#c06060" }}>Clear all</button></div>}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {displayList.map((item: any, i: number) => {
                const isFav = favSet.has(item.timestamp);
                return (
                  <button key={i} onClick={() => setSelected(item)} style={{ background:C.surface, border:`1px solid ${isFav?"#6b4f10":C.border}`, borderRadius:10, padding:"11px 13px", cursor:"pointer", textAlign:"left", width:"100%", fontFamily:font }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.inputText}</div>
                        <div style={{ fontSize:12, color:C.textSub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.translation}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                        <span style={{ fontSize:10, color:C.textMuted }}>{TARGET_LANGS.find(l => l.code===item.targetLang)?.flag}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} style={{ ...iconBtnStyle, color:isFav?"#e6a817":C.textMuted }}>
                          <Star size={16} strokeWidth={1.5} fill={isFav?"#e6a817":"none"} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:6 }}>{item.dateStr}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────
export default function MadiApp() {
  const [tab,           setTab]           = useState("translate");
  const [history,       setHistory]       = useState<any[]>([]);
  const [favTimestamps, setFavTimestamps] = useState<number[]>([]);
  const [customTones,   setCustomTones]   = useState<any[]>([]);
  const [showHistory,   setShowHistory]   = useState(false);
  const [pendingLoad,   setPendingLoad]   = useState<any>(null);
  const [storageReady,  setStorageReady]  = useState(false);

  const favSet = new Set(favTimestamps);

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.history)       setHistory(saved.history);
      if (saved.favTimestamps) setFavTimestamps(saved.favTimestamps);
      if (saved.customTones)   setCustomTones(saved.customTones);
    }
    setStorageReady(true);
  }, []);

  useDebouncedStorage({ history, favTimestamps, customTones }, storageReady);

  const toggleFavorite = useCallback((item: any) => {
    setFavTimestamps(prev => prev.includes(item.timestamp) ? prev.filter(t => t !== item.timestamp) : [item.timestamp, ...prev]);
  }, []);

  const handleReuse = (item: any) => {
    setPendingLoad(item); setShowHistory(false); setTab("translate");
  };

  const tabs = [
    { id:"translate", label:"Translate", icon:"⇄" },
    { id:"script",    label:"Script",    icon:"📄" },
  ];

  return (
    <div style={{ height:"100dvh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:font, color:C.text, fontSize:14 }}>
      <style>{spinnerCSS}</style>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <span style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.3px" }}>MADI</span>
        <span style={{ fontSize:12, color:C.textSub, fontWeight:400, letterSpacing:"0.1em" }}>translator</span>
      </div>

      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 16px", background:C.surface2, border:"none", borderBottom:`1px solid ${C.border}`, cursor:"pointer", fontFamily:font, flexShrink:0, width:"100%" }}>
            <span style={{ fontSize:12, color:C.textSub }}>🕐 {history.length} translations{favTimestamps.length > 0 ? ` · ★ ${favTimestamps.length} favorites` : ""}</span>
            <span style={{ fontSize:11, color:C.textMuted }}>›</span>
          </button>
        )}
        <div style={{ flex:1, overflow:"hidden", display:tab==="translate"?"flex":"none", flexDirection:"column" }}>
          <TranslateTab history={history} setHistory={setHistory} pendingLoad={pendingLoad} setPendingLoad={setPendingLoad} customTones={customTones} setCustomTones={setCustomTones} favSet={favSet} toggleFavorite={toggleFavorite} />
        </div>
        <div style={{ flex:1, overflow:"hidden", display:tab==="script"?"flex":"none", flexDirection:"column" }}>
          <ScriptTab />
        </div>
      </div>

      {showHistory && (
        <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:100, display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
            <button onClick={() => setShowHistory(false)} style={{ ...smallBtn, fontSize:12, padding:"4px 10px" }}>← Close</button>
            <span style={{ fontSize:15, fontWeight:600 }}>History</span>
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>
            <HistoryTab history={history} setHistory={setHistory} onReuse={handleReuse} favSet={favSet} toggleFavorite={toggleFavorite} />
          </div>
        </div>
      )}

      <div style={{ borderTop:`1px solid ${C.border}`, background:C.bg, display:"flex", flexShrink:0, paddingBottom:"env(safe-area-inset-bottom)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"10px 0 12px", border:"none", background:"transparent", cursor:"pointer", fontFamily:font, display:"flex", flexDirection:"column", alignItems:"center", gap:3, color:tab===t.id?C.text:C.textMuted, borderTop:`2px solid ${tab===t.id?C.text:"transparent"}` }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:tab===t.id?600:400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
