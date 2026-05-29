"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import CampusMapPicker from "@/components/parqueo/CampusMapPicker";

// ── Constantes ─────────────────────────────────────────────────────────────────
const ZONAS = ["A", "B", "C", "D"];

const STATUS_META = {
  SCHEDULED: { label: "Programado", cls: "badge-warning",   icon: "fa-clock-o"      },
  ACTIVE:    { label: "En curso",   cls: "badge-success",   icon: "fa-play-circle"  },
  COMPLETED: { label: "Finalizado", cls: "badge-info",      icon: "fa-check-circle" },
  CANCELLED: { label: "Cancelado",  cls: "badge-secondary", icon: "fa-times-circle" },
};

const TARIFF_META = {
  HOURLY:    { label: "Por hora (tarifa normal)", icon: "fa-clock-o"   },
  FLAT_RATE: { label: "Tarifa única (cobro fijo)", icon: "fa-tag"      },
};

const EMPTY_FORM = {
  name: "", description: "", event_date: "",
  start_time: "",       // HH:MM
  end_time: "",         // HH:MM
  ends_next_day: false, // termina al día siguiente
  tariff_mode: "HOURLY", flat_rate: "", affected_zones: [],
  uses_external_parking: false, external_parking_name: "",
  shuttle_available: false, capacity_override: "", notes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-GT", { weekday:"short", day:"2-digit", month:"short", year:"numeric", timeZone:"UTC" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("es-GT", { hour:"2-digit", minute:"2-digit" }) : "—";

function zonasFromStr(str) {
  if (!str) return [];
  return str.split(",").map(z => z.trim()).filter(z => ZONAS.includes(z));
}
function zonasToStr(arr) { return arr.join(","); }

// ── Conversores UTC ↔ hora local para el formulario ───────────────────────────
// event_date se guarda como medianoche UTC → leer con getUTC* para no perder un día en UTC-6
function isoToLocalDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d)) return (isoStr || "").slice(0, 10);
  const p = n => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
// start_time / end_time son horas reales → mostrar en hora local del usuario
function isoToLocalTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d)) return (isoStr || "").slice(11, 16);
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── Banner evento activo ───────────────────────────────────────────────────────
function ActiveEventBanner({ event }) {
  if (!event) return null;
  const isFlatRate = event.tariff_mode === "FLAT_RATE";
  return (
    <div style={{
      background: "linear-gradient(135deg, #21ba4515, #21ba4508)",
      border: "2px solid #21ba45", borderRadius: 10,
      padding: "14px 20px", marginBottom: "1.5rem",
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:220 }}>
        <div style={{ width:44, height:44, borderRadius:"50%", background:"#21ba4520",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <i className="fa fa-play-circle" style={{ color:"#21ba45", fontSize:22 }} />
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#1a9438" }}>
            Evento en curso: {event.name}
          </div>
          <div style={{ fontSize:12, color:"#7d8490" }}>
            {fmtTime(event.start_time)} – {fmtTime(event.end_time)} · Zonas: {event.affected_zones}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontWeight:700, fontSize:18, color:"#800020" }}>
            {isFlatRate ? `Q ${parseFloat(event.flat_rate).toFixed(2)}` : "Normal"}
          </div>
          <div style={{ fontSize:11, color:"#7d8490" }}>{isFlatRate ? "Tarifa única" : "Cobro por hora"}</div>
        </div>
        {event.shuttle_available && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#17a2b8",
            background:"#17a2b810", borderRadius:6, padding:"4px 10px" }}>
            <i className="fa fa-bus" />Busito disponible
          </div>
        )}
        {event.uses_external_parking && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#f2711c",
            background:"#f2711c10", borderRadius:6, padding:"4px 10px" }}>
            <i className="fa fa-map-marker" />{event.external_parking_name || "Parqueo externo"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal crear / editar evento ───────────────────────────────────────────────
function EventoModal({ evento, onClose, onDone }) {
  const isEdit = !!evento;

  const [form, setForm] = useState(() => {
    if (!isEdit) return EMPTY_FORM;
    const startDate = isoToLocalDate(evento.start_time);
    const endDate   = isoToLocalDate(evento.end_time);
    return {
      name:                  evento.name || "",
      description:           evento.description || "",
      event_date:            isoToLocalDate(evento.event_date || evento.start_time),
      start_time:            isoToLocalTime(evento.start_time),
      end_time:              isoToLocalTime(evento.end_time),
      ends_next_day:         endDate !== startDate,
      tariff_mode:           evento.tariff_mode || "HOURLY",
      flat_rate:             evento.flat_rate ? String(evento.flat_rate) : "",
      affected_zones:        zonasFromStr(evento.affected_zones),
      uses_external_parking: evento.uses_external_parking || false,
      external_parking_name: evento.external_parking_name || "",
      shuttle_available:     evento.shuttle_available || false,
      capacity_override:     evento.capacity_override ? String(evento.capacity_override) : "",
      notes:                 evento.notes || "",
    };
  });

  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [spaces,             setSpaces]             = useState({ A:[], B:[], C:[], D:[] });
  const [zoneStats,          setZoneStats]          = useState({});
  const [selectedSpaceCodes, setSelectedSpaceCodes] = useState([]);
  const [spacesLoading,      setSpacesLoading]      = useState(false);
  const [existingCodes,      setExistingCodes]      = useState([]); // reservas ya existentes para este evento

  // Cargar espacios + reservas existentes del evento
  useEffect(() => {
    setSpacesLoading(true);
    const promises = [
      api.get("/spaces?limit=600"),
      api.get("/spaces/status"),
    ];
    // Si es edición, también cargamos las reservas de tipo EVENT para este evento
    if (isEdit && evento?.name) {
      promises.push(api.get("/reservations?limit=500").catch(() => null));
    }
    Promise.all(promises).then(([spacesRes, statusRes, resRes]) => {
      const all = spacesRes.data.data || [];
      const grouped = { A:[], B:[], C:[], D:[] };
      all.forEach(sp => { if (grouped[sp.zone] !== undefined) grouped[sp.zone].push(sp); });
      setSpaces(grouped);
      setZoneStats(statusRes.data.data?.by_zone || {});

      // Pre-cargar reservas existentes de este evento
      if (resRes) {
        const allRes = resRes.data?.data?.data || resRes.data?.data || [];
        const eventNote = `Evento: ${evento.name}`;
        const existing = allRes
          .filter(r => r.type === "EVENT" && r.notes === eventNote
            && (r.status === "CONFIRMED" || r.status === "PENDING"))
          .map(r => r.space?.code)
          .filter(Boolean);
        setExistingCodes(existing);
      }
    }).catch(() => {}).finally(() => setSpacesLoading(false));
  }, [isEdit, evento?.name]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleZona = (z) => setForm(f => ({
    ...f,
    affected_zones: f.affected_zones.includes(z)
      ? f.affected_zones.filter(x => x !== z)
      : [...f.affected_zones, z],
  }));

  const toggleSpace = (code) => setSelectedSpaceCodes(prev =>
    prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
  );

  const submit = async () => {
    if (!form.name.trim())                { setError("El nombre es obligatorio."); return; }
    if (!form.event_date)                 { setError("La fecha del evento es obligatoria."); return; }
    if (!form.start_time)                 { setError("La hora de inicio es obligatoria."); return; }
    if (!form.end_time)                   { setError("La hora de fin es obligatoria."); return; }
    if (form.affected_zones.length === 0) { setError("Selecciona al menos una zona afectada."); return; }
    if (form.tariff_mode === "FLAT_RATE" && !form.flat_rate) { setError("Ingresa el monto de la tarifa única."); return; }

    // Construir datetimes completos desde fecha + hora separados
    const startFull = `${form.event_date}T${form.start_time}`;
    const endDay = form.ends_next_day
      ? (() => { const d = new Date(form.event_date + "T00:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()
      : form.event_date;
    const endFull = `${endDay}T${form.end_time}`;

    if (new Date(endFull) <= new Date(startFull)) {
      setError("La hora de fin debe ser posterior al inicio. Si termina de madrugada, activa \"Termina al día siguiente\"."); return;
    }

    const payload = {
      name:                  form.name.trim(),
      description:           form.description.trim() || null,
      event_date:            form.event_date,
      start_time:            startFull,
      end_time:              endFull,
      tariff_mode:           form.tariff_mode,
      flat_rate:             form.tariff_mode === "FLAT_RATE" ? parseFloat(form.flat_rate) : null,
      affected_zones:        zonasToStr(form.affected_zones),
      uses_external_parking: form.uses_external_parking,
      external_parking_name: form.uses_external_parking ? form.external_parking_name.trim() : null,
      shuttle_available:     form.shuttle_available,
      capacity_override:     form.capacity_override ? parseInt(form.capacity_override) : null,
      notes:                 form.notes.trim() || null,
    };

    setLoading(true); setError("");
    try {
      if (isEdit) {
        await api.patch(`/events/${evento.id}`, payload);
      } else {
        await api.post("/events", payload);
      }

      // Crear reservas para los espacios seleccionados en el mapa (crear y editar)
      if (selectedSpaceCodes.length > 0) {
        const allSpaces = Object.values(spaces).flat();
        // Solo los nuevos (no los que ya existían para este evento)
        const newCodes = selectedSpaceCodes.filter(c => !existingCodes.includes(c));
        const toReserve = allSpaces.filter(s =>
          newCodes.includes(s.code) && !String(s.id || "").startsWith("demo-")
        );
        if (toReserve.length > 0) {
          // Si el evento ya empezó, usar "ahora" como inicio (la API rechaza tiempos pasados)
          const resStart = new Date(startFull) < new Date()
            ? new Date().toISOString()
            : new Date(startFull).toISOString();
          const resEnd   = new Date(endFull).toISOString();
          const results  = await Promise.allSettled(toReserve.map(space =>
            api.post("/reservations", {
              space_id:   space.id,
              start_time: resStart,
              end_time:   resEnd,
              type:       "EVENT",
              notes:      `Evento: ${form.name.trim()}`,
            })
          ));
          const failed = results.filter(r => r.status === "rejected").length;
          if (failed > 0 && failed === toReserve.length) {
            setError(`El evento se guardó pero no se pudieron reservar los ${failed} espacio(s). Verifica que las horas no estén en conflicto.`);
            setLoading(false);
            return;
          }
        }
      }
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Error al guardar el evento.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1060,
      background:"rgba(0,0,0,0.65)", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"1.5rem 1rem" }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:880,
        boxShadow:"0 8px 40px rgba(0,0,0,0.2)", margin:"auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #dee2e6",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h5 style={{ margin:0, color:"#800020", fontWeight:700 }}>
            <i className={`fa ${isEdit ? "fa-pencil" : "fa-flag"}`} style={{ marginRight:8 }} />
            {isEdit ? "Editar evento" : "Nuevo evento de parqueo"}
          </h5>
          <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px" }}>
          <div className="row">
            {/* Nombre */}
            <div className="col-12 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Nombre del evento *</label>
              <input className="form-control" placeholder="Ej: Graduación 2026, Servicio dominical"
                value={form.name} onChange={e => set("name", e.target.value)} />
            </div>

            {/* Descripción */}
            <div className="col-12 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Descripción <span style={{ color:"#7d8490", fontWeight:400 }}>(opcional)</span></label>
              <textarea className="form-control form-control-sm" rows={2}
                placeholder="Detalles adicionales del evento..."
                value={form.description} onChange={e => set("description", e.target.value)} />
            </div>

            {/* ── Fecha + horas (campos separados — sin el picker horrible de Chrome) */}
            <div className="col-md-4 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Fecha *</label>
              <input type="date" className="form-control"
                value={form.event_date} onChange={e => set("event_date", e.target.value)} />
            </div>

            <div className="col-md-4 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Hora inicio *</label>
              <input type="time" className="form-control"
                value={form.start_time} onChange={e => set("start_time", e.target.value)} />
            </div>

            <div className="col-md-4 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Hora fin *</label>
              <input type="time" className="form-control"
                value={form.end_time} onChange={e => set("end_time", e.target.value)} />
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11,
                color:"#7d8490", marginTop:6, cursor:"pointer", userSelect:"none" }}>
                <input type="checkbox" checked={form.ends_next_day}
                  onChange={e => set("ends_next_day", e.target.checked)} />
                Termina al día siguiente
              </label>
            </div>

            {/* Zonas afectadas */}
            <div className="col-md-6 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Zonas afectadas *</label>
              <div style={{ display:"flex", gap:8, marginTop:6 }}>
                {ZONAS.map(z => (
                  <button key={z} type="button"
                    className={`btn btn-sm ${form.affected_zones.includes(z) ? "btn-primary" : "btn-outline-secondary"}`}
                    style={{ minWidth:44, fontWeight:700,
                      background: form.affected_zones.includes(z) ? "#800020" : undefined,
                      borderColor: form.affected_zones.includes(z) ? "#800020" : undefined }}
                    onClick={() => toggleZona(z)}>
                    {z}
                  </button>
                ))}
                <button type="button" className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize:11 }}
                  onClick={() => set("affected_zones", form.affected_zones.length === 4 ? [] : [...ZONAS])}>
                  {form.affected_zones.length === 4 ? "Ninguna" : "Todas"}
                </button>
              </div>
            </div>

            {/* Modo de tarifa */}
            <div className="col-md-6 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Modo de cobro *</label>
              <select className="form-control" value={form.tariff_mode}
                onChange={e => set("tariff_mode", e.target.value)}>
                {Object.entries(TARIFF_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Tarifa única */}
            {form.tariff_mode === "FLAT_RATE" && (
              <div className="col-md-4 form-group">
                <label style={{ fontSize:13, fontWeight:600 }}>Monto tarifa única (Q) *</label>
                <input type="number" min="0" step="0.50" className="form-control"
                  placeholder="Ej: 10.00"
                  value={form.flat_rate} onChange={e => set("flat_rate", e.target.value)} />
              </div>
            )}

            {/* Capacidad override */}
            <div className="col-md-4 form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Capacidad especial <span style={{ color:"#7d8490", fontWeight:400 }}>(opcional)</span></label>
              <input type="number" min="0" className="form-control form-control-sm"
                placeholder="Dejar vacío = capacidad normal"
                value={form.capacity_override} onChange={e => set("capacity_override", e.target.value)} />
            </div>

            {/* Switches */}
            <div className="col-12 form-group">
              <label style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:10 }}>Opciones adicionales</label>
              <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={form.uses_external_parking}
                    onChange={e => set("uses_external_parking", e.target.checked)} />
                  <i className="fa fa-map-marker" style={{ color:"#f2711c" }} />
                  Usa parqueo externo
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={form.shuttle_available}
                    onChange={e => set("shuttle_available", e.target.checked)} />
                  <i className="fa fa-bus" style={{ color:"#17a2b8" }} />
                  Busito de traslado disponible
                </label>
              </div>
            </div>

            {/* Nombre parqueo externo */}
            {form.uses_external_parking && (
              <div className="col-md-8 form-group">
                <label style={{ fontSize:13, fontWeight:600 }}>Nombre del parqueo externo</label>
                <input className="form-control form-control-sm"
                  placeholder="Ej: Terreno calle 5a, Proyecto Las Torres"
                  value={form.external_parking_name}
                  onChange={e => set("external_parking_name", e.target.value)} />
              </div>
            )}

            {/* Notas */}
            <div className="col-12 form-group" style={{ marginBottom:0 }}>
              <label style={{ fontSize:13, fontWeight:600 }}>Notas internas <span style={{ color:"#7d8490", fontWeight:400 }}>(opcional)</span></label>
              <textarea className="form-control form-control-sm" rows={2}
                placeholder="Instrucciones para el personal, contacto responsable, etc."
                value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>

          {/* ── Mapa de espacios ─────────────────────────────────────────────── */}
          <div style={{ marginTop:8 }}>
            <hr style={{ margin:"12px 0" }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:8 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:"#800020", marginBottom:2, display:"block" }}>
                  <i className="fa fa-map" style={{ marginRight:6 }} />
                  {isEdit ? "Agregar espacios al evento" : "Reservar espacios físicos"}
                  <span style={{ color:"#7d8490", fontWeight:400, marginLeft:6, fontSize:12 }}>(opcional)</span>
                </label>
                <div style={{ fontSize:11, color:"#7d8490" }}>
                  {isEdit
                    ? "Amarillo = ya reservado (no clickeable). Selecciona espacios verdes para agregar más."
                    : "Clic en un parqueo del mapa → selecciona espacios individuales para bloquearlos."}
                </div>
              </div>
              {selectedSpaceCodes.length > 0 && (
                <div style={{
                  background:"rgba(128,0,32,0.10)", color:"#800020",
                  fontWeight:700, fontSize:12, padding:"5px 12px", borderRadius:20,
                  border:"1px solid rgba(128,0,32,0.25)", flexShrink:0,
                }}>
                  <i className="fa fa-check-circle" style={{ marginRight:5 }} />
                  {selectedSpaceCodes.length} espacio{selectedSpaceCodes.length > 1 ? "s" : ""} seleccionado{selectedSpaceCodes.length > 1 ? "s" : ""}
                </div>
              )}
            </div>

            {spacesLoading ? (
              <div style={{ textAlign:"center", padding:"2rem", color:"#7d8490", fontSize:13 }}>
                <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} />Cargando mapa...
              </div>
            ) : (
              <div style={{ borderRadius:8, overflow:"hidden", border:"1px solid #dee2e6" }}>
                <CampusMapPicker
                  spaces={spaces}
                  zoneStats={zoneStats}
                  selectedCodes={selectedSpaceCodes}
                  onToggle={toggleSpace}
                />
              </div>
            )}

            {/* Espacios ya reservados para este evento (viceversa) */}
            {existingCodes.length > 0 && (
              <div style={{
                marginTop:8, padding:"7px 12px",
                background:"rgba(251,189,8,0.10)", borderRadius:6, border:"1px solid rgba(251,189,8,0.4)",
                fontSize:12, color:"#555", display:"flex", flexWrap:"wrap", gap:6, alignItems:"center",
              }}>
                <span style={{ fontWeight:600, color:"#856404" }}>
                  <i className="fa fa-lock" style={{ marginRight:5 }} />
                  Ya reservados para este evento:
                </span>
                {existingCodes.map(c => (
                  <span key={c} style={{
                    background:"#fbbd08", color:"#212529",
                    borderRadius:4, padding:"2px 7px", fontSize:11, fontWeight:700,
                  }}>{c}</span>
                ))}
              </div>
            )}

            {/* Nuevos espacios seleccionados */}
            {selectedSpaceCodes.filter(c => !existingCodes.includes(c)).length > 0 && (
              <div style={{
                marginTop:6, padding:"7px 12px",
                background:"rgba(128,0,32,0.06)", borderRadius:6,
                fontSize:12, color:"#555", display:"flex", flexWrap:"wrap", gap:6, alignItems:"center",
              }}>
                <span style={{ fontWeight:600, color:"#800020" }}>Nuevos a reservar:</span>
                {selectedSpaceCodes.filter(c => !existingCodes.includes(c)).map(c => (
                  <span key={c} style={{
                    background:"#800020", color:"#fff",
                    borderRadius:4, padding:"2px 7px", fontSize:11, fontWeight:700,
                  }}>{c}</span>
                ))}
                <button type="button"
                  onClick={() => setSelectedSpaceCodes([])}
                  style={{ marginLeft:"auto", fontSize:11, color:"#db2828", background:"none", border:"none", cursor:"pointer", padding:"0 4px" }}>
                  <i className="fa fa-times" style={{ marginRight:3 }} />Limpiar
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginTop:12, marginBottom:0, padding:"8px 12px", fontSize:13 }}>
              <i className="fa fa-exclamation-circle" style={{ marginRight:6 }} />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #dee2e6", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={loading}
            style={{ background:"#800020", borderColor:"#800020", fontWeight:600 }}>
            {loading
              ? <><i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} />Guardando...</>
              : <><i className={`fa ${isEdit ? "fa-check" : "fa-plus"}`} style={{ marginRight:6 }} />
                  {isEdit ? "Guardar cambios" : "Crear evento"}</>}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de evento ─────────────────────────────────────────────────────────
function EventoCard({ evento, onEdit, onCancel }) {
  const sm   = STATUS_META[evento.status] || STATUS_META.SCHEDULED;
  const tm   = TARIFF_META[evento.tariff_mode];
  const zonas = zonasFromStr(evento.affected_zones);
  const canEdit   = evento.status === "SCHEDULED";
  const canCancel = evento.status !== "CANCELLED" && evento.status !== "COMPLETED";

  return (
    <div className="card" style={{ marginBottom:"1rem", borderLeft:`4px solid ${
      evento.status === "ACTIVE"    ? "#21ba45" :
      evento.status === "SCHEDULED" ? "#fbbd08" :
      evento.status === "CANCELLED" ? "#7d8490" : "#17a2b8"
    }` }}>
      <div className="card-body" style={{ padding:"1rem 1.25rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
          {/* Info principal */}
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span className={`badge ${sm.cls}`}>
                <i className={`fa ${sm.icon}`} style={{ marginRight:4 }} />{sm.label}
              </span>
              {evento.tariff_mode === "FLAT_RATE" && (
                <span className="badge badge-primary" style={{ background:"#800020", fontSize:11 }}>
                  <i className="fa fa-tag" style={{ marginRight:3 }} />Tarifa única Q{parseFloat(evento.flat_rate).toFixed(2)}
                </span>
              )}
              {evento.shuttle_available && (
                <span className="badge badge-info" style={{ fontSize:11 }}>
                  <i className="fa fa-bus" style={{ marginRight:3 }} />Busito
                </span>
              )}
              {evento.uses_external_parking && (
                <span className="badge badge-warning" style={{ fontSize:11 }}>
                  <i className="fa fa-map-marker" style={{ marginRight:3 }} />Ext.
                </span>
              )}
            </div>

            <h5 style={{ margin:"0 0 4px", color:"#800020", fontWeight:700 }}>{evento.name}</h5>

            {evento.description && (
              <p style={{ fontSize:12, color:"#7d8490", margin:"0 0 6px" }}>{evento.description}</p>
            )}

            <div style={{ display:"flex", gap:16, fontSize:12, color:"#7d8490", flexWrap:"wrap" }}>
              <span><i className="fa fa-calendar" style={{ marginRight:4 }} />{fmtDate(evento.event_date)}</span>
              <span><i className="fa fa-clock-o" style={{ marginRight:4 }} />{fmtTime(evento.start_time)} – {fmtTime(evento.end_time)}</span>
              <span>
                <i className="fa fa-map" style={{ marginRight:4 }} />
                Zonas:{" "}
                {zonas.map(z => (
                  <span key={z} style={{ display:"inline-block", background:"#800020", color:"#fff",
                    borderRadius:3, fontSize:10, fontWeight:700, padding:"1px 5px", marginLeft:3 }}>
                    {z}
                  </span>
                ))}
              </span>
              {evento.capacity_override && (
                <span><i className="fa fa-car" style={{ marginRight:4 }} />Cap. especial: {evento.capacity_override}</span>
              )}
            </div>

            {evento.uses_external_parking && evento.external_parking_name && (
              <div style={{ fontSize:11, color:"#f2711c", marginTop:4 }}>
                <i className="fa fa-map-marker" style={{ marginRight:4 }} />
                Parqueo externo: {evento.external_parking_name}
              </div>
            )}

            {evento.notes && (
              <div style={{ fontSize:11, color:"#7d8490", marginTop:4, fontStyle:"italic" }}>
                <i className="fa fa-sticky-note-o" style={{ marginRight:4 }} />{evento.notes}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div style={{ display:"flex", gap:6, alignItems:"flex-start", flexShrink:0 }}>
            {canEdit && (
              <button className="btn btn-sm btn-default" onClick={() => onEdit(evento)}
                title="Editar evento">
                <i className="fa fa-pencil" />
              </button>
            )}
            {canCancel && (
              <button className="btn btn-sm btn-danger" onClick={() => onCancel(evento)}
                title="Cancelar evento">
                <i className="fa fa-times" />
              </button>
            )}
          </div>
        </div>

        {/* Creado por */}
        <div style={{ marginTop:8, fontSize:11, color:"#adb5bd" }}>
          <i className="fa fa-user-o" style={{ marginRight:4 }} />
          Creado por {evento.created_by
            ? `${evento.created_by.first_name} ${evento.created_by.last_name}`
            : "—"}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function EventosPage() {
  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const [evRes, activeRes] = await Promise.all([
        api.get("/events", { params }),
        api.get("/events/active"),
      ]);
      setEvents(evRes.data?.data?.data || []);
      setTotal(evRes.data?.data?.total || 0);
      setActiveEvent(activeRes.data?.data || null);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleDone = () => { setShowCreate(false); setEditTarget(null); load(); };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.delete(`/events/${cancelTarget.id}`);
      setCancelTarget(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Error al cancelar el evento.");
    } finally { setCancelling(false); }
  };

  // Conteos por estado
  const countByStatus = (s) => events.filter(e => e.status === s).length;

  return (
    <>
      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <div className="row clearfix" style={{ marginBottom:"0.5rem" }}>
        {[
          { label:"Total eventos",  value:total,                      color:"#800020", icon:"fa-flag"         },
          { label:"Programados",    value:countByStatus("SCHEDULED"), color:"#fbbd08", icon:"fa-clock-o"      },
          { label:"En curso",       value:countByStatus("ACTIVE"),    color:"#21ba45", icon:"fa-play-circle"  },
          { label:"Finalizados",    value:countByStatus("COMPLETED"), color:"#17a2b8", icon:"fa-check-circle" },
        ].map(({ label, value, color, icon }) => (
          <div className="col-lg-3 col-md-6 col-sm-12" key={label}>
            <div className="card" style={{ borderLeft:`4px solid ${color}`, marginBottom:"1rem" }}>
              <div className="card-body" style={{ display:"flex", alignItems:"center", gap:"1rem", padding:"1rem 1.25rem" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:`${color}20`,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className={`fa ${icon}`} style={{ color, fontSize:18 }} />
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:12, color:"#7d8490", marginTop:2 }}>{label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Banner evento activo ──────────────────────────────────────────────── */}
      <ActiveEventBanner event={activeEvent} />

      {/* ── Controles ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom:"1rem" }}>
        <div className="card-body" style={{ padding:"0.85rem 1.25rem",
          display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <select className="form-control form-control-sm" style={{ maxWidth:180 }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <button className="btn btn-default btn-sm" onClick={load}>
            <i className="fa fa-refresh" />
          </button>

          <button className="btn btn-primary btn-sm" style={{ marginLeft:"auto",
            background:"#800020", borderColor:"#800020", fontWeight:600 }}
            onClick={() => setShowCreate(true)}>
            <i className="fa fa-plus" style={{ marginRight:6 }} />Nuevo evento
          </button>
        </div>
      </div>

      {/* ── Lista de eventos ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}>
          <i className="fa fa-spinner fa-spin fa-2x" style={{ color:"#800020" }} />
          <p style={{ color:"#7d8490", marginTop:"1rem" }}>Cargando eventos...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign:"center", padding:"3rem", color:"#7d8490" }}>
            <i className="fa fa-flag fa-3x" style={{ display:"block", marginBottom:12, color:"#adb5bd" }} />
            <p style={{ marginBottom:0 }}>No hay eventos registrados. Crea el primero con el botón de arriba.</p>
          </div>
        </div>
      ) : (
        events.map(ev => (
          <EventoCard
            key={ev.id}
            evento={ev}
            onEdit={setEditTarget}
            onCancel={setCancelTarget}
          />
        ))
      )}

      {/* ── Modal cancelar ────────────────────────────────────────────────────── */}
      {cancelTarget && (
        <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1060,
          background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }}
          onClick={() => setCancelTarget(null)}>
          <div className="modal-dialog" style={{ maxWidth:400, width:"100%", margin:0 }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ color:"#db2828" }}>
                  <i className="fa fa-times-circle" style={{ marginRight:8 }} />Cancelar evento
                </h5>
                <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={() => setCancelTarget(null)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize:14 }}>
                  ¿Confirmas la cancelación de <strong>{cancelTarget.name}</strong>?
                </p>
                <p style={{ fontSize:12, color:"#7d8490", marginBottom:0 }}>
                  Esta acción no puede deshacerse. El evento quedará marcado como cancelado en el historial.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger btn-sm" onClick={confirmCancel} disabled={cancelling}>
                  {cancelling
                    ? <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} />
                    : <i className="fa fa-times" style={{ marginRight:6 }} />}
                  Cancelar evento
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setCancelTarget(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales crear / editar ────────────────────────────────────────────── */}
      {showCreate  && <EventoModal onClose={() => setShowCreate(false)} onDone={handleDone} />}
      {editTarget  && <EventoModal evento={editTarget} onClose={() => setEditTarget(null)} onDone={handleDone} />}
    </>
  );
}
