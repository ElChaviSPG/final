"use client";
import { useState } from "react";

// Misma lógica que mapa/page.js → asigna cada espacio al sub-parqueo correcto
function parqueoIdOfSpace(sp) {
  const num = parseInt((sp.code || "").replace(/[^0-9]/g, ""), 10) || 0;
  const half = Math.floor(125 / 2); // 62
  if (sp.zone === "A") return num <= half ? "P5" : "P1"; // Norte / Oeste
  if (sp.zone === "B") return num <= half ? "P2" : "P6"; // Sur / Este
  if (sp.zone === "C") return "P3";
  if (sp.zone === "D") return "P4";
  return null;
}

const PARQUEOS = [
  { id: "P5", zone: "A", label: "Zona A · Norte", pts: "631.613,17.504 714.758,62.724 612.65,195.464 526.587,134.199", lx: 621, ly: 102 },
  { id: "P1", zone: "A", label: "Zona A · Oeste", pts: "224.638,627.236 423.02,285.903 504.707,339.875 309.242,681.208", lx: 365, ly: 483 },
  { id: "P2", zone: "B", label: "Zona B · Sur",   pts: "468.239,590.769 666.621,694.336 625.778,761.436 433.231,643.282", lx: 548, ly: 672 },
  { id: "P6", zone: "B", label: "Zona B · Este",  pts: "781.858,633.071 986.074,590.769 1059.01,809.573 951.066,951.066 853.333,933.561 748.308,816.866 723.51,697.254", lx: 871, ly: 790 },
  { id: "P3", zone: "C", label: "Zona C",         pts: "1117.36,463.863 1184.46,516.376 1080.89,637.447 1018.17,577.641", lx: 1100, ly: 548 },
  { id: "P4", zone: "D", label: "Zona D",         pts: "1204.88,554.302 1277.81,602.439 1153.82,774.564 1075.05,710.382", lx: 1178, ly: 660 },
];

function zoneColor(pct) {
  if (pct > 85) return "#db2828";
  if (pct > 60) return "#fbbd08";
  return "#21ba45";
}

// Panel flotante de espacios con selección múltiple
function SpacePickerPanel({ parqueo, spaces, selectedCodes, onToggle, onClose }) {
  const spaceColor = (sp) => {
    if (selectedCodes.includes(sp.code)) return "#800020";
    if (sp.status === "OCCUPIED")        return "#db2828";
    if (sp.status === "RESERVED")        return "#fbbd08";
    if (sp.status === "MAINTENANCE")     return "#7d8490";
    return "#21ba45";
  };
  // RESERVED también es no-seleccionable (ya está bloqueado por otra reserva)
  const isUnavailable = (sp) =>
    sp.status === "OCCUPIED" || sp.status === "MAINTENANCE" || sp.status === "RESERVED";

  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: 14,
      width: 270, boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
      color: "#222",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{parqueo.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Zona {parqueo.zone}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#aaa", lineHeight: 1, padding: 0 }}>×</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, maxHeight: 240, overflowY: "auto", marginBottom: 10 }}>
        {spaces.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#aaa", fontSize: 12, padding: "16px 0" }}>
            Sin espacios disponibles
          </div>
        ) : spaces.map(sp => {
          const num = sp.code.split("-")[1] || sp.code;
          const isSelected = selectedCodes.includes(sp.code);
          const unavailable = isUnavailable(sp);
          return (
            <div key={sp.id}
              onClick={() => !unavailable && onToggle(sp.code)}
              title={`${sp.code} — ${sp.status}`}
              style={{
                background: spaceColor(sp),
                color: "#fff", borderRadius: 3, fontSize: 10, fontWeight: 700,
                textAlign: "center", padding: "4px 2px",
                cursor: unavailable ? "not-allowed" : "pointer",
                opacity: unavailable ? 0.55 : 1,
                outline: isSelected ? "2px solid #5a0016" : "none",
              }}>
              {isSelected ? "✓" : num}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: 10, color: "#666" }}>
        {[["#21ba45","Disponible"],["#800020","Seleccionado"],["#db2828","Ocupado"],["#fbbd08","Reservado (bloqueado)"]].map(([c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: "inline-block", flexShrink: 0 }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

// Calcula stats por sub-parqueo desde los espacios reales
function computeSubStats(spaces) {
  const stats = {};
  Object.values(spaces).flat().forEach(sp => {
    const pid = parqueoIdOfSpace(sp);
    if (!pid) return;
    if (!stats[pid]) stats[pid] = { total: 0, available: 0 };
    stats[pid].total++;
    if (sp.status === "AVAILABLE") stats[pid].available++;
  });
  return stats;
}

export default function CampusMapPicker({ spaces, zoneStats = {}, selectedCodes, onToggle }) {
  const [hovered,      setHovered]  = useState(null);
  const [activeParqueo, setActive]  = useState(null);
  const [tooltip,      setTooltip]  = useState({ x: 0, y: 0 });

  const subStats = computeSubStats(spaces);

  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: (e.clientX - r.left) * (1536 / r.width),
      y: (e.clientY - r.top)  * (1024 / r.height),
    });
  };

  const hovP = PARQUEOS.find(p => p.id === hovered);

  // Espacios para el parqueo activo, filtrados al sub-parqueo exacto
  const activeSpaces = activeParqueo
    ? (spaces[activeParqueo.zone] || []).filter(sp => parqueoIdOfSpace(sp) === activeParqueo.id)
    : [];

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox="0 0 1536 1024"
        style={{ width: "100%", borderRadius: 8, display: "block" }}
        onMouseMove={handleMove}
      >
        <defs>
          <filter id="picker-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.9" />
          </filter>
        </defs>

        <image href="/mapa-campus-real.png" x={0} y={0} width={1536} height={1024}
          preserveAspectRatio="xMidYMid slice" />

        {PARQUEOS.map(({ id, zone, label, pts, lx, ly }) => {
          const ss    = subStats[id] || {};
          const isHov = hovered === id;
          const isAct = activeParqueo?.id === id;

          // Contar seleccionados en este sub-parqueo
          const selCount = (spaces[zone] || [])
            .filter(s => parqueoIdOfSpace(s) === id && selectedCodes.includes(s.code)).length;

          return (
            <g key={id}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setActive(isAct ? null : { id, zone, label })}
              style={{ cursor: "pointer" }}>

              <polygon
                points={pts}
                fill={isAct ? "#800020" : isHov ? "#db2828" : "transparent"}
                fillOpacity={isAct ? 0.30 : isHov ? 0.20 : 0}
                stroke="none"
              />

              {/* Etiqueta */}
              <rect x={lx - 58} y={ly - 26} width={116} height={selCount > 0 ? 58 : 46} rx={7}
                fill={isAct ? "rgba(100,0,20,0.95)" : "rgba(180,0,30,0.90)"} />
              <text x={lx} y={ly - 10} textAnchor="middle"
                fill="#fff" fontSize={14} fontWeight={800} filter="url(#picker-shadow)">
                {label}
              </text>
              <text x={lx} y={ly + 7} textAnchor="middle"
                fill={ss.available > 0 ? "#7ef0a0" : "#ffbaba"} fontSize={11} fontWeight={600}>
                {ss.total ?? "—"} espacios
              </text>
              {selCount > 0 && (
                <text x={lx} y={ly + 22} textAnchor="middle"
                  fill="#ffd700" fontSize={11} fontWeight={700}>
                  ✓ {selCount} seleccionado{selCount > 1 ? "s" : ""}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip hover */}
        {hovP && (() => {
          const ss   = subStats[hovP.id] || {};
          const occupied = (ss.total || 0) - (ss.available || 0);
          const pct  = ss.total ? Math.round((occupied / ss.total) * 100) : 0;
          const fill = zoneColor(pct);
          const tx   = Math.min(tooltip.x + 20, 1340);
          const ty   = Math.max(tooltip.y - 110, 8);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={180} height={82} rx={9}
                fill="rgba(10,10,18,0.94)" stroke={fill} strokeWidth={2} />
              <text x={tx + 90} y={ty + 20} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={800}>
                {hovP.label}
              </text>
              <text x={tx + 90} y={ty + 44} textAnchor="middle" fill={fill} fontSize={22} fontWeight={900}>
                {pct}%
              </text>
              <text x={tx + 90} y={ty + 60} textAnchor="middle" fill="#aaa" fontSize={11}>ocupado</text>
              <text x={tx + 90} y={ty + 76} textAnchor="middle" fill="#888" fontSize={10}>
                {ss.available ?? 0} libres · {occupied} ocupados/reservados
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Panel flotante de selección */}
      {activeParqueo && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <SpacePickerPanel
            parqueo={activeParqueo}
            spaces={activeSpaces}
            selectedCodes={selectedCodes}
            onToggle={onToggle}
            onClose={() => setActive(null)}
          />
        </div>
      )}

      {/* Instrucción */}
      {!activeParqueo && (
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          background: "rgba(0,0,0,0.65)", borderRadius: 6,
          padding: "5px 10px", fontSize: 11, color: "#ccc",
          pointerEvents: "none",
        }}>
          Clic en un parqueo para ver sus espacios
        </div>
      )}
    </div>
  );
}
