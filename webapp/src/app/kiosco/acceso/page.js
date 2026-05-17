"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS = { ADMIN:"Administrador", TEACHER:"Docente", STUDENT:"Estudiante", VISITOR:"Visitante", SECURITY:"Seguridad" };
const ROLE_COLORS = { ADMIN:"#a333c8", TEACHER:"#2185d0", STUDENT:"#21ba45", VISITOR:"#f2711c", SECURITY:"#fbbd08" };

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function Row({ icon, label, value, valueColor }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #1e2a36" }}>
      <span style={{ color:"#666", fontSize:14 }}>
        <i className={`fas ${icon}`} style={{ marginRight:8, width:16 }} />{label}
      </span>
      <span style={{ color: valueColor ?? "#ccc", fontSize:14, fontWeight:700 }}>{value}</span>
    </div>
  );
}

// ── Métodos de pago ───────────────────────────────────────────────────────────
const KIOSKO_METODOS = [
  { value:"CASH",     label:"Efectivo",       icon:"fa-money-bill" },
  { value:"CARD",     label:"Tarjeta",        icon:"fa-credit-card" },
  { value:"TRANSFER", label:"Transferencia",  icon:"fa-exchange-alt" },
  { value:"QR_CODE",  label:"QR / Billetera", icon:"fa-qrcode" },
];

// ── Detectar red de tarjeta ───────────────────────────────────────────────────
function detectBrand(digits) {
  if (digits.startsWith("4"))                           return { label:"VISA",       accent:"#1a1f71" };
  if (/^5[1-5]/.test(digits)||/^2[2-7]/.test(digits))  return { label:"MASTERCARD", accent:"#eb001b" };
  if (/^3[47]/.test(digits))                            return { label:"AMEX",       accent:"#007bc1" };
  return null;
}

// ── Tarjeta visual animada ────────────────────────────────────────────────────
function CardVisual({ num, expiry, cvv, name, field }) {
  const digits = num.replace(/\D/g,"");
  const brand  = detectBrand(digits);
  const groups = [0,1,2,3].map(g => digits.slice(g*4, g*4+4).padEnd(4,"•"));

  const hl = (f) => ({
    background: field===f ? "rgba(251,189,8,0.18)" : "transparent",
    borderRadius:4, padding:"2px 6px",
    color: field===f ? "#fbbd08" : "#fff",
    transition:"all 0.2s",
  });

  return (
    <div style={{
      width:"100%", maxWidth:340, aspectRatio:"1.586/1",
      background: brand
        ? `linear-gradient(135deg,${brand.accent}dd,#0d1a25)`
        : "linear-gradient(135deg,#1a2a3a,#0d1a25)",
      borderRadius:20, padding:"18px 22px", position:"relative", overflow:"hidden",
      boxShadow:"0 16px 48px rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.08)",
      transition:"background 0.5s", userSelect:"none",
    }}>
      {/* burbujas decorativas */}
      <div style={{ position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
      <div style={{ position:"absolute", bottom:-40, left:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />

      {/* chip EMV */}
      <div style={{ width:42, height:32, background:"linear-gradient(135deg,#c9a227,#f5d580)", borderRadius:6, marginBottom:18, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:"33%", right:"33%", bottom:0, background:"rgba(0,0,0,0.12)" }} />
        <div style={{ position:"absolute", top:"33%", left:0, right:0, bottom:"33%", background:"rgba(0,0,0,0.12)" }} />
      </div>

      {/* número */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {groups.map((g,gi) => (
          <span key={gi} style={{
            fontFamily:"monospace", fontSize:16, fontWeight:700, letterSpacing:3,
            color: gi < Math.ceil(digits.length/4) ? "#fff" : "rgba(255,255,255,0.25)",
            background: field==="num" && gi===Math.min(3,Math.floor(digits.length/4)) ? "rgba(251,189,8,0.2)" : "transparent",
            borderRadius:4, padding:"1px 3px", transition:"background 0.2s",
          }}>{g}</span>
        ))}
      </div>

      {/* expiry / cvv / marca */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:8, letterSpacing:1.5, textTransform:"uppercase", marginBottom:2 }}>Válido hasta</div>
          <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, ...hl("exp") }}>
            {expiry||"MM/AA"}
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:8, letterSpacing:1.5, textTransform:"uppercase", marginBottom:2 }}>CVV</div>
          <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, ...hl("cvv") }}>
            {cvv ? "•".repeat(cvv.length) : "•••"}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          {brand
            ? <div style={{ fontSize:12, fontWeight:900, color:"#fff", letterSpacing:1 }}>{brand.label}</div>
            : <i className="fas fa-credit-card" style={{ fontSize:18, color:"rgba(255,255,255,0.2)" }} />}
        </div>
      </div>

      <div style={{ marginTop:10, fontFamily:"monospace", fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.45)" }}>
        {name||"NOMBRE DEL TITULAR"}
      </div>
    </div>
  );
}

// ── Teclado numérico táctil ───────────────────────────────────────────────────
function NumPad({ onPress }) {
  const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","→"];

  const tap = (k, e) => {
    e.preventDefault(); // elimina delay 300ms en iOS Safari
    onPress(k);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, width:"100%", maxWidth:340 }}>
      {keys.map((k,i) => {
        const isBack = k === "⌫";
        const isNext = k === "→";
        return (
          <button key={i}
            onPointerDown={(e) => tap(k, e)}
            style={{
              padding:"19px 0", borderRadius:14, border: isNext ? "2px solid #fbbd08" : "none",
              fontSize: isBack ? 20 : isNext ? 16 : 26, fontWeight:700,
              background: isNext ? "rgba(251,189,8,0.12)" : isBack ? "rgba(255,100,50,0.08)" : "rgba(255,255,255,0.07)",
              color: isNext ? "#fbbd08" : isBack ? "#ff9966" : "#fff",
              cursor:"pointer", touchAction:"manipulation",
              WebkitTapHighlightColor:"transparent", userSelect:"none",
              boxShadow:"0 3px 10px rgba(0,0,0,0.35)",
            }}
          >
            {isNext ? <><i className="fas fa-arrow-right" style={{ marginRight:4 }} />Sig.</> : k}
          </button>
        );
      })}
    </div>
  );
}

// ── Pantalla tarjeta de crédito ───────────────────────────────────────────────
const CARD_FIELDS = [
  { key:"num",    label:"Número de tarjeta",  hint:"16 dígitos",  maxLen:16 },
  { key:"exp",    label:"Fecha de vencimiento", hint:"MM/AA",     maxLen:4  },
  { key:"cvv",    label:"CVV",                hint:"3 o 4 dígitos", maxLen:4 },
  { key:"name",   label:"Nombre del titular", hint:"Como aparece en la tarjeta", maxLen:26 },
];

function CardScreen({ amountDue, onConfirm, onBack, loading, error }) {
  const [num,    setNum]    = useState("");
  const [exp,    setExp]    = useState("");
  const [cvv,    setCvv]    = useState("");
  const [name,   setName]   = useState("");
  const [field,  setField]  = useState("num");
  const nameRef = useRef(null);

  const fieldIdx   = CARD_FIELDS.findIndex(f => f.key === field);
  const isLastField = fieldIdx === CARD_FIELDS.length - 1;

  const numDigits = num.replace(/\D/g,"");
  const expDigits = exp.replace(/\D/g,"");

  // Validar fecha: mes 01-12, año >= año actual (2 dígitos)
  const now       = new Date();
  const curYear2  = now.getFullYear() % 100;  // ej. 26
  const curMonth  = now.getMonth() + 1;        // 1-12
  const expValid  = (() => {
    if (expDigits.length < 4) return false;
    const mm = parseInt(expDigits.slice(0,2), 10);
    const yy = parseInt(expDigits.slice(2,4), 10);
    if (mm < 1 || mm > 12) return false;
    if (yy < curYear2) return false;
    if (yy === curYear2 && mm < curMonth) return false;
    return true;
  })();

  const complete  = numDigits.length === 16 && expValid && cvv.length >= 3 && name.trim().length >= 2;

  const progress = [
    numDigits.length === 16,
    expValid,
    cvv.length >= 3,
    name.trim().length >= 2,
  ];

  const formatNum = (raw) => {
    const d = raw.replace(/\D/g,"").slice(0,16);
    return d.replace(/(.{4})/g,"$1 ").trim();
  };
  const formatExp = (raw) => {
    const d = raw.replace(/\D/g,"").slice(0,4);
    if (d.length > 2) return d.slice(0,2)+"/"+d.slice(2);
    return d;
  };

  // teclado físico
  useEffect(() => {
    if (field === "name") { nameRef.current?.focus(); return; }
    const handle = (e) => {
      if (/^\d$/.test(e.key)) { pressKey(e.key); e.preventDefault(); }
      else if (e.key === "Backspace") { pressKey("⌫"); e.preventDefault(); }
      else if (e.key === "Enter" || e.key === "Tab") { pressKey("→"); e.preventDefault(); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [field, num, exp, cvv]); // eslint-disable-line

  const pressKey = (k) => {
    if (k === "→") {
      if (!isLastField) setField(CARD_FIELDS[fieldIdx+1].key);
      return;
    }
    if (field === "num") {
      const d = num.replace(/\D/g,"");
      if (k === "⌫") setNum(formatNum(d.slice(0,-1)));
      else if (d.length < 16) { const nd = d+k; setNum(formatNum(nd)); if (nd.length===16) setField("exp"); }
    } else if (field === "exp") {
      const d = exp.replace(/\D/g,"");
      if (k === "⌫") { setExp(formatExp(d.slice(0,-1))); return; }
      if (d.length >= 4) return;
      const nd = d + k;
      // Validar mes: primer dígito solo 0 o 1; segundo dígito según el primero
      if (nd.length === 1) {
        if (parseInt(k) > 1) { setExp(formatExp("0" + k)); return; } // 2-9 → 02-09 auto
      }
      if (nd.length === 2) {
        const mm = parseInt(nd, 10);
        if (mm < 1 || mm > 12) return; // bloquea 00 y 13-19
      }
      // Validar año: no puede ser menor al año actual
      if (nd.length === 4) {
        const yy = parseInt(nd.slice(2,4), 10);
        if (yy < curYear2) return; // año pasado → bloquea
      }
      setExp(formatExp(nd));
      if (nd.length === 4) {
        // Verificar que no sea mes vencido
        const mm = parseInt(nd.slice(0,2), 10);
        const yy = parseInt(nd.slice(2,4), 10);
        if (yy > curYear2 || (yy === curYear2 && mm >= curMonth)) setField("cvv");
      }
    } else if (field === "cvv") {
      if (k === "⌫") setCvv(c => c.slice(0,-1));
      else if (cvv.length < 4) { const nc = cvv+k; setCvv(nc); if (nc.length>=3) setField("name"); }
    }
  };

  const ref4 = `**** **** **** ${numDigits.slice(-4)}`;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"16px 20px", paddingTop:24, background:"linear-gradient(160deg,#0f1419 60%,#1a0a0f 100%)", overflowY:"auto" }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, width:"100%", maxWidth:340 }}>
        <button onPointerDown={e=>{e.preventDefault();onBack();}} style={{
          background:"none", border:"1px solid #2e3d4e", borderRadius:8,
          color:"#aaa", padding:"8px 14px", cursor:"pointer", fontSize:13,
          touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
        }}>
          <i className="fas fa-arrow-left" />
        </button>
        <div>
          <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Pago con tarjeta</div>
          <div style={{ color:"#fbbd08", fontSize:13, fontWeight:700 }}>Q {amountDue?.toFixed(2)}</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {progress.map((ok,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background: ok?"#21ba45":"#2e3d4e", transition:"background 0.3s" }} />
          ))}
        </div>
      </div>

      {/* tarjeta */}
      <div style={{ marginBottom:16 }}>
        <CardVisual num={num} expiry={exp} cvv={cvv} name={name} field={field} />
      </div>

      {/* pestañas de campo */}
      <div style={{ display:"flex", gap:6, marginBottom:14, width:"100%", maxWidth:340 }}>
        {CARD_FIELDS.map(f => (
          <button key={f.key} onPointerDown={e=>{e.preventDefault();setField(f.key);}} style={{
            flex:1, padding:"6px 0", borderRadius:8, border:"none",
            background: field===f.key ? "rgba(251,189,8,0.15)" : "rgba(255,255,255,0.04)",
            color: field===f.key ? "#fbbd08" : progress[CARD_FIELDS.findIndex(x=>x.key===f.key)] ? "#21ba45" : "#555",
            fontSize:10, fontWeight:700, cursor:"pointer",
            touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
            borderBottom: field===f.key ? "2px solid #fbbd08" : "2px solid transparent",
          }}>
            {progress[CARD_FIELDS.findIndex(x=>x.key===f.key)] && field!==f.key
              ? <i className="fas fa-check" />
              : f.key==="num" ? "Número" : f.key==="exp" ? "Venc." : f.key==="cvv" ? "CVV" : "Nombre"}
          </button>
        ))}
      </div>

      {/* hint */}
      <div style={{ color:"#555", fontSize:11, marginBottom:12, textAlign:"center" }}>
        {CARD_FIELDS[fieldIdx].hint}
        {field!=="name" && <span style={{ marginLeft:8, color:"#2e3d4e" }}>· teclado físico o táctil</span>}
      </div>

      {/* campo nombre (texto libre) */}
      {field === "name" ? (
        <input
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value.toUpperCase().slice(0,26))}
          placeholder="JUAN GARCIA"
          autoComplete="off"
          style={{
            width:"100%", maxWidth:340, padding:"16px", borderRadius:12, border:"2px solid #fbbd08",
            background:"#1a2430", color:"#fff", fontSize:18, fontWeight:700, fontFamily:"monospace",
            letterSpacing:2, textAlign:"center", outline:"none", marginBottom:12,
          }}
        />
      ) : (
        <NumPad onPress={pressKey} />
      )}

      {/* Error de fecha vencida */}
      {field === "exp" && expDigits.length === 4 && !expValid && (
        <div style={{ color:"#ff6b6b", fontSize:12, marginTop:8, textAlign:"center" }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight:6 }} />
          Fecha inválida o tarjeta vencida
        </div>
      )}

      {error && <div style={{ color:"#ff6b6b", fontSize:13, marginTop:10 }}>{error}</div>}

      {/* botón pagar */}
      <button
        onPointerDown={e=>{e.preventDefault(); if(complete&&!loading) onConfirm({num:ref4,exp,cvv});}}
        disabled={!complete||loading}
        style={{
          width:"100%", maxWidth:340, padding:"16px", borderRadius:14, border:"none", marginTop:16,
          background: complete&&!loading ? "#fbbd08" : "#1e2a36",
          color: complete&&!loading ? "#000" : "#444",
          fontSize:17, fontWeight:800,
          cursor: complete&&!loading ? "pointer" : "not-allowed",
          touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
          boxShadow: complete&&!loading ? "0 4px 20px rgba(251,189,8,0.3)" : "none",
          transition:"all 0.2s",
        }}
      >
        {loading
          ? <><i className="fas fa-spinner fa-spin" style={{ marginRight:8 }} />Procesando…</>
          : complete
            ? <><i className="fas fa-lock" style={{ marginRight:8 }} />Pagar Q {amountDue?.toFixed(2)}</>
            : <span style={{ opacity:0.5 }}>Completa todos los campos</span>}
      </button>

      <div style={{ color:"#2e3d4e", fontSize:11, marginTop:10, textAlign:"center" }}>
        <i className="fas fa-shield-alt" style={{ marginRight:6 }} />Simulación de pago seguro · USPG
      </div>
    </div>
  );
}

// ── Pantalla de pago ──────────────────────────────────────────────────────────
function PagoKiosco({ result, onPaid }) {
  const [metodo,  setMetodo]  = useState("CASH");
  const [step,    setStep]    = useState("method");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const pagar = async (cardInfo) => {
    setLoading(true); setError("");
    // Simular rechazo: número que empiece con 0000 = tarjeta declinada
    if (cardInfo && cardInfo.num.startsWith("0000")) {
      await new Promise(r => setTimeout(r, 1800));
      setError("Tarjeta declinada. Intenta con otro método de pago.");
      setLoading(false);
      return;
    }
    try {
      const r = await fetch("/api/parqueo/payments", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          session_id:            result.session_id,
          payment_method:        metodo,
          transaction_reference: cardInfo ? `${cardInfo.num} · ${cardInfo.exp}` : null,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message ?? "Error al procesar");
      setDone(true);
      setTimeout(onPaid, 2500);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg,#0f1419 60%,#051a09 100%)" }}>
      <i className="fas fa-check-circle" style={{ fontSize:100, color:"#21ba45", marginBottom:24 }} />
      <div style={{ color:"#21ba45", fontSize:28, fontWeight:800, marginBottom:8 }}>¡Pago confirmado!</div>
      <div style={{ color:"#aaa", fontSize:16 }}>Q {result.amount_due?.toFixed(2)} · {KIOSKO_METODOS.find(m=>m.value===metodo)?.label}</div>
    </div>
  );

  if (step === "card") return (
    <CardScreen
      amountDue={result.amount_due}
      onConfirm={pagar}
      onBack={() => { setStep("method"); setError(""); }}
      loading={loading}
      error={error}
    />
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, background:"linear-gradient(160deg,#0f1419 60%,#1a0a0f 100%)" }}>
      <i className="fas fa-money-bill" style={{ fontSize:60, color:"#fbbd08", marginBottom:16 }} />
      <div style={{ color:"#fff", fontSize:22, fontWeight:800, marginBottom:4 }}>Pago requerido</div>
      <div style={{ color:"#aaa", fontSize:14, marginBottom:28 }}>Selecciona el método para completar tu salida</div>

      <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2a36", borderRadius:16, padding:20, width:"100%", maxWidth:420, marginBottom:24 }}>
        <Row icon="fa-car"    label="Vehículo" value={result.placa} valueColor="#fff" />
        <Row icon="fa-clock"  label="Tiempo"   value={formatDuration(result.duration_minutes)} />
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid #1e2a36" }}>
          <span style={{ color:"#666", fontSize:14 }}><i className="fas fa-money-bill" style={{ marginRight:8 }} />Total</span>
          <span style={{ color:"#fbbd08", fontSize:22, fontWeight:900 }}>Q {result.amount_due?.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, width:"100%", maxWidth:420, marginBottom:24 }}>
        {KIOSKO_METODOS.map(m => (
          <button key={m.value}
            onPointerDown={e=>{e.preventDefault();setMetodo(m.value);}}
            style={{
              border:`2px solid ${metodo===m.value?"#fbbd08":"#1e2a36"}`,
              background: metodo===m.value ? "rgba(251,189,8,0.1)" : "rgba(255,255,255,0.03)",
              borderRadius:12, padding:"16px 8px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:8,
              touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
            }}>
            <i className={`fas ${m.icon}`} style={{ fontSize:24, color: metodo===m.value?"#fbbd08":"#555" }} />
            <span style={{ fontSize:13, fontWeight:700, color: metodo===m.value?"#fbbd08":"#aaa" }}>{m.label}</span>
          </button>
        ))}
      </div>

      {error && <div style={{ color:"#ff6b6b", fontSize:13, marginBottom:12 }}>{error}</div>}

      <button
        onPointerDown={e=>{e.preventDefault(); metodo==="CARD" ? setStep("card") : pagar(null);}}
        disabled={loading}
        style={{
          width:"100%", maxWidth:420, padding:"16px", borderRadius:12, border:"none",
          background: loading ? "#1e2a36" : "#fbbd08", color: loading ? "#aaa" : "#000",
          fontSize:17, fontWeight:800, cursor: loading ? "not-allowed" : "pointer",
          touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
        }}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" style={{ marginRight:8 }} />Procesando…</>
          : metodo==="CARD"
            ? <><i className="fas fa-credit-card" style={{ marginRight:8 }} />Ingresar tarjeta</>
            : <><i className="fas fa-check" style={{ marginRight:8 }} />Confirmar pago</>}
      </button>
    </div>
  );
}

// ── Pantalla de resultado ─────────────────────────────────────────────────────
function ResultScreen({ result, onReset }) {
  const [countdown, setCountdown] = useState(8);
  const [pagoDone,  setPagoDone]  = useState(false);

  const needsPago = result.action === "EXIT" && (result.amount_due ?? 0) > 0 && !result.is_paid && !pagoDone;

  useEffect(() => {
    if (needsPago) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [needsPago]);

  useEffect(() => {
    if (!needsPago && countdown === 0) onReset();
  }, [countdown, needsPago, onReset]);

  if (needsPago) return <PagoKiosco result={result} onPaid={() => setPagoDone(true)} />;

  const isEntry = result.action === "ENTRY";
  const isError = result.action === "ERROR";
  const color   = isError ? "#db2828" : isEntry ? "#21ba45" : "#2185d0";
  const icon    = isError ? "fa-times-circle" : isEntry ? "fa-sign-in-alt" : "fa-sign-out-alt";
  const label   = isError ? "Acceso denegado" : isEntry ? "ENTRADA permitida" : "SALIDA permitida";
  const bg      = isError
    ? "linear-gradient(160deg,#1a0505 60%,#0f0000 100%)"
    : isEntry
      ? "linear-gradient(160deg,#051a09 60%,#0a1f0e 100%)"
      : "linear-gradient(160deg,#05101a 60%,#0a1522 100%)";

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, background:bg }}>
      <i className={`fas ${icon}`} style={{ fontSize:90, color, marginBottom:20 }} />
      <div style={{ color, fontSize:26, fontWeight:800, marginBottom:28 }}>{label}</div>

      {!isError && (
        <div style={{ width:"100%", maxWidth:440 }}>
          <div style={{
            background:"rgba(255,255,255,0.05)", border:`2px solid ${color}`,
            borderRadius:16, padding:24, textAlign:"center", marginBottom:16,
          }}>
            <div style={{ color:"#aaa", fontSize:12, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Vehículo</div>
            <div style={{ color:"#fff", fontSize:36, fontWeight:900, letterSpacing:6, marginBottom:6 }}>{result.placa}</div>
            <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>{result.owner_name}</div>
            {result.role && (
              <div style={{
                display:"inline-block", marginTop:8,
                background:`${ROLE_COLORS[result.role]??'#aaa'}22`,
                border:`1px solid ${ROLE_COLORS[result.role]??'#aaa'}`,
                color: ROLE_COLORS[result.role]??'#aaa',
                borderRadius:20, padding:"3px 14px", fontSize:12, fontWeight:700,
              }}>
                {ROLE_LABELS[result.role]??result.role}
              </div>
            )}
          </div>

          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2a36", borderRadius:12, padding:"4px 16px", marginBottom:16 }}>
            {isEntry ? (
              <>
                <Row icon="fa-map-marker-alt" label="Espacio asignado" value={`${result.space_code} · Zona ${result.zone}`} valueColor="#fff" />
                {result.evento      && <Row icon="fa-calendar" label="Evento"       value={result.evento} />}
                {result.suscripcion && <Row icon="fa-id-card"  label="Suscripción"  value="Activa — sin cargo" valueColor="#21ba45" />}
              </>
            ) : (
              <>
                <Row icon="fa-map-marker-alt" label="Espacio"      value={`${result.space_code} · Zona ${result.zone}`} />
                <Row icon="fa-clock"          label="Tiempo total" value={formatDuration(result.duration_minutes)} />
                <Row icon="fa-money-bill"     label="Monto"
                  value={result.amount_due===0 ? "Sin cargo" : `Q ${result.amount_due?.toFixed(2)}`}
                  valueColor={result.amount_due===0 ? "#21ba45" : "#fbbd08"} />
                {result.suscripcion && <Row icon="fa-id-card" label="Suscripción" value="Activa — sin cargo" valueColor="#21ba45" />}
              </>
            )}
          </div>
        </div>
      )}

      {isError && (
        <div style={{
          background:"rgba(219,40,40,0.1)", border:"1px solid rgba(219,40,40,0.3)",
          borderRadius:16, padding:24, maxWidth:380, textAlign:"center", marginBottom:24,
        }}>
          <div style={{ color:"#ff6b6b", fontSize:16 }}>{result.message}</div>
        </div>
      )}

      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ height:6, borderRadius:3, background:"#1e2a36", overflow:"hidden", marginBottom:10 }}>
          <div style={{ height:"100%", background:color, width:`${(countdown/8)*100}%`, transition:"width 1s linear" }} />
        </div>
        <div style={{ color:"#555", fontSize:13, textAlign:"center" }}>Volviendo en {countdown}s…</div>
      </div>
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function AccesoQR() {
  const router      = useRouter();
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);
  const rafRef      = useRef(null);
  const manualRef   = useRef(null);

  const [camActive,  setCamActive]  = useState(false);
  const [camError,   setCamError]   = useState("");
  const [processing, setProcessing] = useState(false);
  const [result,     setResult]     = useState(null);
  const [manualCode, setManualCode] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current   = null;
    detectorRef.current = null;
    setCamActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const processCode = useCallback(async (code) => {
    if (processing || !code?.trim()) return;
    setProcessing(true);
    stopCamera();
    try {
      const r = await fetch("/api/parqueo/qr/scan", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await r.json();
      if (!r.ok) setResult({ action:"ERROR", message: json.message ?? "QR inválido o expirado" });
      else       setResult(json.data);
    } catch {
      setResult({ action:"ERROR", message:"Error de conexión con el servidor" });
    } finally {
      setProcessing(false);
    }
  }, [processing, stopCamera]);

  const startCamera = async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1280 }, height:{ ideal:720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamActive(true);

      if ("BarcodeDetector" in window) {
        detectorRef.current = new window.BarcodeDetector({ formats:["qr_code"] });
        const detect = async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) { processCode(barcodes[0].rawValue); return; }
          } catch (_) {}
          rafRef.current = requestAnimationFrame(detect);
        };
        rafRef.current = requestAnimationFrame(detect);
      } else {
        setCamError("Tu navegador no soporta detección automática. Usa el campo manual.");
      }
    } catch (e) {
      setCamError(
        e.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Usa el campo manual."
          : "No se pudo acceder a la cámara."
      );
    }
  };

  const reset = useCallback(() => {
    setResult(null);
    setManualCode("");
    setTimeout(() => startCamera(), 300);
  }, []); // eslint-disable-line

  if (result) return <ResultScreen result={result} onReset={reset} />;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"linear-gradient(160deg,#0f1419 60%,#1a0a0f 100%)" }}>
      <style>{`@keyframes scanline { 0%{top:10%} 50%{top:85%} 100%{top:10%} }`}</style>

      {/* Header */}
      <div style={{ padding:"20px 28px", display:"flex", alignItems:"center", gap:16, borderBottom:"1px solid #1e2a36" }}>
        <button onClick={() => { stopCamera(); router.push("/kiosco"); }} style={{
          background:"none", border:"1px solid #2e3d4e", borderRadius:8,
          color:"#aaa", padding:"8px 14px", cursor:"pointer", fontSize:14,
        }}>
          <i className="fas fa-arrow-left" style={{ marginRight:6 }} />Volver
        </button>
        <div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:18 }}>Control de acceso QR</div>
          <div style={{ color:"#666", fontSize:12 }}>Apunta la cámara al código QR de tu reserva</div>
        </div>
      </div>

      {/* Área cámara */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28 }}>
        <div style={{
          position:"relative", width:"100%", maxWidth:400, aspectRatio:"1/1",
          background:"#0a0f14", borderRadius:20, overflow:"hidden",
          border:"2px solid rgba(128,0,32,0.4)", marginBottom:24,
        }}>
          <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover" }} playsInline muted />

          {!camActive && !processing && (
            <div style={{
              position:"absolute", inset:0, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.88)",
            }}>
              <i className="fas fa-camera" style={{ fontSize:56, color:"rgba(255,255,255,0.15)", marginBottom:16 }} />
              <p style={{ color:"#666", fontSize:13, textAlign:"center", margin:"0 0 20px", padding:"0 24px" }}>
                Toca el botón para activar la cámara
              </p>
              <button onClick={startCamera} style={{
                background:"#800020", border:"none", borderRadius:12,
                padding:"14px 32px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer",
              }}>
                <i className="fas fa-camera" style={{ marginRight:8 }} />Activar cámara
              </button>
            </div>
          )}

          {processing && (
            <div style={{
              position:"absolute", inset:0, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.88)",
            }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize:48, color:"#800020", marginBottom:16 }} />
              <div style={{ color:"#fff", fontSize:15 }}>Verificando acceso…</div>
            </div>
          )}

          {camActive && !processing && (
            <>
              {[[0,0,"bottom","right"],[0,"auto","bottom","left"],["auto",0,"top","right"],["auto","auto","top","left"]].map(([b,r],i) => (
                <div key={i} style={{
                  position:"absolute", width:32, height:32,
                  bottom:b!=="auto"?0:undefined, right:r!=="auto"?0:undefined,
                  top:b==="auto"?0:undefined,    left:r==="auto"?0:undefined,
                  borderBottom:b!=="auto"?"3px solid #800020":undefined,
                  borderRight: r!=="auto"?"3px solid #800020":undefined,
                  borderTop:   b==="auto"?"3px solid #800020":undefined,
                  borderLeft:  r==="auto"?"3px solid #800020":undefined,
                }} />
              ))}
              <div style={{
                position:"absolute", left:12, right:12, height:2,
                background:"linear-gradient(90deg,transparent,#800020,transparent)",
                animation:"scanline 2s ease-in-out infinite",
              }} />
            </>
          )}
        </div>

        {camError && (
          <div style={{
            background:"rgba(251,189,8,0.1)", border:"1px solid rgba(251,189,8,0.3)",
            borderRadius:8, padding:"10px 16px", color:"#fbbd08", fontSize:13,
            textAlign:"center", marginBottom:16, maxWidth:400, width:"100%",
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight:8 }} />{camError}
          </div>
        )}

        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ color:"#444", fontSize:12, textAlign:"center", marginBottom:8 }}>
            — o ingresa el código manualmente —
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              ref={manualRef}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && processCode(manualCode)}
              placeholder="Pega el contenido del QR aquí"
              style={{
                flex:1, background:"#1a2430", border:"1px solid #2e3d4e",
                borderRadius:10, padding:"12px 14px",
                color:"#fff", fontSize:12, outline:"none", fontFamily:"monospace",
              }}
            />
            <button
              onClick={() => processCode(manualCode)}
              disabled={!manualCode.trim() || processing}
              style={{
                background: manualCode.trim() ? "#800020" : "#2e3d4e",
                border:"none", borderRadius:10, padding:"12px 18px",
                color:"#fff", cursor: manualCode.trim() ? "pointer" : "not-allowed",
              }}
            >
              <i className="fas fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
