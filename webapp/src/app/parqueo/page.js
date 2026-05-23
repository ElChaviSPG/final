"use client";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

// ── Datos demo para la gráfica de tráfico ────────────────────────────────────
function demoHourly() {
  return Array.from({ length: 24 }, (_, h) =>
    h < 6 ? 1 : h < 8 ? 10 + h * 3 : h < 12 ? 55 + (h - 8) * 8 : h < 14 ? 80 : h < 18 ? 60 - (h - 14) * 5 : 15
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, bg }) {
  return (
    <div className="col-lg-3 col-md-6 col-sm-12">
      <div className="card" style={{ borderLeft: `4px solid ${color}`, marginBottom: "1rem" }}>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <i className={`fa ${icon}`} style={{ color, fontSize: 22 }} />
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, color: "#7d8490", marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Badge de estado ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    ACTIVE:    { label: "Activa",     cls: "badge-success" },
    COMPLETED: { label: "Completada", cls: "badge-secondary" },
    PAID:      { label: "Pagado",     cls: "badge-success" },
    PENDING:   { label: "Pendiente",  cls: "badge-warning" },
    BLACKLIST: { label: "Blacklist",  cls: "badge-danger" },
  };
  const s = map[status] || { label: status, cls: "badge-secondary" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

// ── Alerta de seguridad ───────────────────────────────────────────────────────
function AlertRow({ type, message, severity }) {
  const colorMap = { CRITICAL: "#db2828", WARNING: "#fbbd08", INFO: "#17a2b8" };
  const iconMap  = { CRITICAL: "fa-exclamation-circle", WARNING: "fa-exclamation-triangle", INFO: "fa-info-circle" };
  const color = colorMap[severity] || "#7d8490";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 12px", borderLeft: `3px solid ${color}`,
      background: `${color}15`, borderRadius: "0 6px 6px 0", marginBottom: 8,
    }}>
      <i className={`fa ${iconMap[severity] || "fa-bell"}`} style={{ color, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{type.replace(/_/g, " ")}</div>
        <div style={{ fontSize: 12, color: "#7d8490" }}>{message}</div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ParqueoDashboard() {
  const [stats, setStats]           = useState(null);
  const [activity, setActivity]     = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [hourly, setHourly]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult, setJobResult]   = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, activityRes, alertsRes, hourlyRes, zonesRes] = await Promise.allSettled([
          api.get("/dashboard"),
          api.get("/dashboard/activity?limit=10"),
          api.get("/dashboard/alerts"),
          api.get("/dashboard/traffic"),
          api.get("/spaces/status"),
        ]);
        const dashData = statsRes.status === "fulfilled" ? statsRes.value.data.data : null;
        const byZone = zonesRes.status === "fulfilled" ? (zonesRes.value.data.data?.by_zone || {}) : {};
        if (dashData) setStats({ ...dashData, spaces: { ...dashData.spaces, by_zone: byZone } });
        if (activityRes.status === "fulfilled") setActivity(activityRes.value.data.data?.recent_sessions || []);
        if (alertsRes.status  === "fulfilled") setAlerts(alertsRes.value.data.data?.alerts || []);
        const hourlyData = hourlyRes.status === "fulfilled"
          ? (hourlyRes.value.data.data?.hourly_entries || [])
          : demoHourly();
        setHourly(hourlyData.length ? hourlyData : demoHourly());
      } catch (e) {
        console.error("Error cargando dashboard:", e);
        setHourly(demoHourly());
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Job de suscripciones ────────────────────────────────────────────────────
  async function runSubscriptionJob() {
    setJobRunning(true);
    setJobResult(null);
    try {
      const r = await api.post("/subscriptions/run-job");
      setJobResult({ ok: true, ...r.data.data });
    } catch (e) {
      setJobResult({ ok: false, error: e.response?.data?.message ?? "Error al ejecutar el job" });
    } finally {
      setJobRunning(false);
    }
  }

  // ── Gráfica ApexCharts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current || hourly.length === 0) return;

    const initChart = () => {
      if (!window.ApexCharts) return;
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
      chartInstance.current = new window.ApexCharts(chartRef.current, {
        chart: { type: "area", height: 220, toolbar: { show: false }, sparkline: { enabled: false }, background: "transparent" },
        series: [{ name: "Entradas", data: hourly }],
        xaxis: { categories: hours, labels: { style: { colors: "#7d8490", fontSize: "10px" }, rotate: -45 } },
        yaxis: { labels: { style: { colors: "#7d8490" } } },
        colors: ["#800020"],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
        stroke: { curve: "smooth", width: 2 },
        dataLabels: { enabled: false },
        grid: { borderColor: "rgba(0,0,0,0.06)" },
        tooltip: { theme: "light" },
        theme: { mode: "light" },
      });
      chartInstance.current.render();
    };

    if (window.ApexCharts) {
      initChart();
    } else {
      const script = document.createElement("script");
      script.src = "/assets/bundles/apexcharts.bundle.js";
      script.onload = initChart;
      document.head.appendChild(script);
    }
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [hourly]);

  // ── Helpers de formato ──────────────────────────────────────────────────────
  const fmt = (d) => d ? new Date(d).toLocaleString("es-GT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—";
  const dur = (entry) => {
    const mins = Math.floor((Date.now() - new Date(entry).getTime()) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) {
    return (
      <div className="row clearfix">
        <div className="col-12 text-center" style={{ padding: "3rem" }}>
          <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#800020" }} />
          <p style={{ color: "#7d8490", marginTop: "1rem" }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const sp = stats?.spaces    || {};
  const se = stats?.sessions  || {};
  const rv = stats?.revenue   || {};
  const al = stats?.alerts    || {};

  return (
    <>
      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="row clearfix">
        <StatCard
          icon="fa-clock-o"  label="Sesiones activas"  value={se.active ?? 0}
          sub={`${se.today_entries ?? 0} entradas hoy`}
          color="#800020"   bg="rgba(128,0,32,0.12)"
        />
        <StatCard
          icon="fa-map-marker" label="Espacios disponibles" value={sp.available ?? 0}
          sub={`${sp.occupancy_rate ?? 0}% ocupado`}
          color="#21ba45"  bg="rgba(33,186,69,0.12)"
        />
        <StatCard
          icon="fa-money"  label="Ingresos del día"  value={`Q ${Number(rv.today ?? 0).toFixed(2)}`}
          sub="pagos completados"
          color="#17a2b8"  bg="rgba(23,162,184,0.12)"
        />
        <StatCard
          icon="fa-exclamation-triangle" label="Alertas activas" value={alerts.length}
          sub={al.blacklisted_vehicles ? `${al.blacklisted_vehicles} en blacklist` : "Sin incidentes"}
          color={alerts.length > 0 ? "#db2828" : "#fbbd08"} bg={alerts.length > 0 ? "rgba(219,40,40,0.12)" : "rgba(251,189,8,0.12)"}
        />
      </div>

      {/* ── Gráfica + Alertas ───────────────────────────────────────────────── */}
      <div className="row clearfix">
        {/* Gráfica de tráfico por hora */}
        <div className="col-lg-8 col-md-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fa fa-area-chart" style={{ marginRight: 6 }} />
                Tráfico por hora — hoy
              </h3>
            </div>
            <div className="card-body" style={{ padding: "0.5rem 1rem 1rem" }}>
              <div ref={chartRef} />
            </div>
          </div>
        </div>

        {/* Panel de alertas */}
        <div className="col-lg-4 col-md-12">
          <div className="card" style={{ height: "100%" }}>
            <div className="card-header">
              <h3 className="card-title">
                <i className="fa fa-bell" style={{ marginRight: 6 }} />
                Alertas de seguridad
              </h3>
            </div>
            <div className="card-body" style={{ padding: "1rem", overflowY: "auto", maxHeight: 280 }}>
              {alerts.length === 0 ? (
                <div style={{ textAlign: "center", color: "#7d8490", padding: "2rem 0" }}>
                  <i className="fa fa-check-circle fa-2x" style={{ color: "#21ba45", display: "block", marginBottom: 8 }} />
                  Sin alertas activas
                </div>
              ) : (
                alerts.map((a, i) => (
                  <AlertRow key={i} type={a.type} message={a.message} severity={a.severity} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla de actividad reciente ─────────────────────────────────────── */}
      <div className="row clearfix">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fa fa-list-alt" style={{ marginRight: 6 }} />
                Actividad reciente
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0">
                  <thead>
                    <tr style={{ background: "rgba(128,0,32,0.08)" }}>
                      <th>Placa</th>
                      <th>Propietario</th>
                      <th>Espacio</th>
                      <th>Entrada</th>
                      <th>Tiempo</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center" style={{ padding: "2rem", color: "#7d8490" }}>
                          Sin actividad reciente
                        </td>
                      </tr>
                    ) : (
                      activity.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong style={{ color: "#800020" }}>{s.vehicle?.placa || "—"}</strong>
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {s.user ? `${s.user.first_name} ${s.user.last_name}` : "—"}
                          </td>
                          <td>
                            <span className="badge badge-default">{s.space?.code || "—"}</span>
                            {s.space?.zone && (
                              <span style={{ fontSize: 11, color: "#7d8490", marginLeft: 4 }}>
                                Zona {s.space.zone}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12 }}>{fmt(s.entry_time)}</td>
                          <td style={{ fontSize: 12 }}>{s.status === "ACTIVE" ? dur(s.entry_time) : `${s.duration_minutes ?? 0}m`}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>
                            {s.amount_due != null ? `Q ${Number(s.amount_due).toFixed(2)}` : "—"}
                          </td>
                          <td><StatusBadge status={s.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Control de suscripciones ────────────────────────────────────────── */}
      <div className="row clearfix">
        <div className="col-12">
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <h3 className="card-title">
                <i className="fa fa-id-card" style={{ marginRight: 6 }} />
                Control de suscripciones
              </h3>
            </div>
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#7d8490" }}>
                  Ejecuta el proceso automático: expira suscripciones vencidas, bloquea accesos,
                  renueva las que tienen auto-renovación activa y envía alertas a usuarios cuya
                  suscripción vence en 3 días.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={runSubscriptionJob}
                  disabled={jobRunning}
                  style={{ minWidth: 220 }}
                >
                  {jobRunning
                    ? <><i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />Procesando...</>
                    : <><i className="fa fa-refresh" style={{ marginRight: 6 }} />Ejecutar job de suscripciones</>
                  }
                </button>
                {jobResult && (
                  <div style={{
                    fontSize: 13,
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: jobResult.ok ? "#21ba4520" : "#db282820",
                    color: jobResult.ok ? "#1a6e3c" : "#db2828",
                    border: `1px solid ${jobResult.ok ? "#21ba45" : "#db2828"}`,
                  }}>
                    {jobResult.ok
                      ? `✓ ${jobResult.expired} vencidas · ${jobResult.renewed} renovadas · ${jobResult.alerts_sent} alertas`
                      : `✗ ${jobResult.error}`
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resumen por zona ────────────────────────────────────────────────── */}
      <div className="row clearfix">
        {["A", "B", "C", "D"].map((zone) => {
          const z = stats?.spaces?.by_zone?.[zone] || {};
          const total = z.total || 0;
          const avail = z.available || 0;
          const occ   = z.occupied || 0;
          const pct   = total > 0 ? Math.round((occ / total) * 100) : 0;
          const color = pct > 85 ? "#db2828" : pct > 60 ? "#fbbd08" : "#21ba45";
          return (
            <div className="col-lg-3 col-md-6 col-sm-12" key={zone}>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div className="card-body" style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Zona {zone}</span>
                    <span style={{ fontSize: 13, color }}>{pct}% ocupado</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#7d8490" }}>
                    <span><i className="fa fa-circle" style={{ color: "#21ba45", marginRight: 4 }} />{avail} libres</span>
                    <span><i className="fa fa-circle" style={{ color: "#db2828", marginRight: 4 }} />{occ} ocupados</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
