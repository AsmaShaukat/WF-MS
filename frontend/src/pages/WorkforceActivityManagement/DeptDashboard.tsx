import { useState, useEffect, useCallback, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
interface SubSectionOption {
  id:               number;
  sub_section_name: string;
  section_id:       number;
  "section__name":  string;
}

interface SubBreakdown {
  sub_section_id:   number;
  sub_section_name: string;
  section_name:     string;
  total_employees:  number;
  total_activities: number;
  risks:            number;
}

interface DashData {
  allowed_subs:         SubSectionOption[];
  selected_sub_ids:     number[];
  sub_section_names:    string[];
  total_employees:      number;
  total_activities:     number;
  total_bp_tasks:       number;
  completed_tasks:      number;
  inprogress_tasks:     number;
  not_started:          number;
  risks_encountered:    number;
  avg_completion:       number;
  seven_days:           { date: string; day: string; activities: number; risks: number }[];
  subsection_breakdown: SubBreakdown[];
  date_from:            string;
  date_to:              string;
}

/* ═══════════════════════════════════════════════════
   KPI CARD
═══════════════════════════════════════════════════ */
function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string; icon: string; color: string;
}) {
  const border: Record<string, string> = {
    blue: "border-blue-500 bg-blue-50", green: "border-green-500 bg-green-50",
    orange: "border-orange-500 bg-orange-50", red: "border-red-500 bg-red-50",
    purple: "border-purple-500 bg-purple-50", teal: "border-teal-500 bg-teal-50",
    indigo: "border-indigo-500 bg-indigo-50",
  };
  const text: Record<string, string> = {
    blue: "text-blue-700", green: "text-green-700", orange: "text-orange-700",
    red: "text-red-700", purple: "text-purple-700", teal: "text-teal-700",
    indigo: "text-indigo-700",
  };
  return (
    <div className={`rounded-xl border-t-4 p-4 shadow-sm hover:shadow-md transition-shadow ${border[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-3xl font-bold ${text[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-SECTION PICKER — checkbox dropdown
   Groups subsections by parent section name
═══════════════════════════════════════════════════ */
function SubSectionPicker({ options, selected, onChange, disabled }: {
  options:   SubSectionOption[];
  selected:  number[];
  onChange:  (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);

  const toggleAll = () =>
    onChange(selected.length === options.length ? [] : options.map(o => o.id));

  // Group by section
  const grouped = options.reduce<Record<string, SubSectionOption[]>>((acc, ss) => {
    const key = ss["section__name"] || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ss);
    return acc;
  }, {});

  const label =
    selected.length === 0              ? "No sub-section selected"
    : selected.length === options.length && options.length > 1 ? "All Sub-Sections"
    : selected.length === 1            ? (options.find(o => o.id === selected[0])?.sub_section_name ?? "1 selected")
    :                                    `${selected.length} sub-sections selected`;

  // Single sub-section — just show badge
  if (options.length <= 1) {
    return (
      <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
        📍 {options[0]?.sub_section_name ?? "Your Sub-Section"}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg
                   text-xs font-medium text-gray-700 hover:border-blue-400 transition
                   min-w-[200px] disabled:opacity-50"
      >
        <span className="text-blue-600">📍</span>
        <span className="flex-1 text-left truncate">{label}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200
                        rounded-xl shadow-lg min-w-[240px] py-1 max-h-72 overflow-y-auto">

          {/* Select All */}
          <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50
                            cursor-pointer border-b border-gray-100">
            <input
              type="checkbox"
              checked={selected.length === options.length}
              onChange={toggleAll}
              className="w-3.5 h-3.5 rounded accent-blue-600"
            />
            <span className="text-xs font-semibold text-gray-600">All Sub-Sections</span>
          </label>

          {/* Grouped by section */}
          {Object.entries(grouped).map(([secName, subs]) => (
            <div key={secName}>
              {/* Section group header */}
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {secName}
                </span>
              </div>
              {subs.map(ss => (
                <label
                  key={ss.id}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-blue-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(ss.id)}
                    onChange={() => toggle(ss.id)}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  <span className="text-xs text-gray-700">{ss.sub_section_name}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PIE COLORS
═══════════════════════════════════════════════════ */
const PIE_COLORS = ["#2e7d32", "#1565c0", "#90a4ae"];

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function DeptDashboard() {
  const user          = JSON.parse(localStorage.getItem("user") || "{}");
  const gradeId       = user?.grade_id        ?? 0;
  const sectionId     = user?.section_id      ?? 0;
  const subSectionId  = user?.sub_section_id  ?? 0;
  const erpid         = user?.erpid            ?? 0;
  const isSuperuser   = user?.is_superuser    ?? false;
  const ADMIN_GRADES  = [9, 10, 11];
  const today         = new Date().toISOString().split("T")[0];

  const [data,        setData]        = useState<DashData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [dateFrom,    setDateFrom]    = useState(today);
  const [dateTo,      setDateTo]      = useState(today);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const hasAccess = isSuperuser || ADMIN_GRADES.includes(gradeId);

  /* ── Fetch ────────────────────────────────────────────────── */
  const fetchData = useCallback(async (overrideIds?: number[]) => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        grade_id:       String(gradeId),
        erp_id:         String(erpid),
        section_id:     String(sectionId),
        sub_section_id: String(subSectionId),
        is_superuser:   String(isSuperuser),
        date_from:      dateFrom,
        date_to:        dateTo,
      });

      // undefined = first load, don't send sub_section_ids → backend picks defaults
      if (overrideIds !== undefined) {
        params.set("sub_section_ids", overrideIds.join(","));
      }

      const res = await axios.get(`/dashboard/department/?${params}`);
      setData(res.data);

      // Always sync selectedIds from backend response
      if (res.data.selected_sub_ids !== undefined) {
        setSelectedIds(res.data.selected_sub_ids);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Dashboard load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, [gradeId, erpid, sectionId, subSectionId, isSuperuser, dateFrom, dateTo, hasAccess]);

  useEffect(() => {
    fetchData(undefined); // first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubChange = (ids: number[]) => {
    setSelectedIds(ids);
    fetchData(ids);
  };

  const handleApply = () => fetchData(selectedIds);

  /* ── No access ──────────────────────────────────────────── */
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm font-medium">Access Denied</p>
          <p className="text-xs mt-1">Department Dashboard sirf Grade 9/10/11 ke liye hai</p>
        </div>
      </div>
    );
  }

  const allowedSubs: SubSectionOption[] = data?.allowed_subs ?? [];
  const showPicker = allowedSubs.length > 1;

  const pieData = data ? [
    { name: "Completed",   value: data.completed_tasks },
    { name: "In Progress", value: data.inprogress_tasks },
    { name: "Not Started", value: data.not_started },
  ] : [];

  return (
    <>
      <PageMeta title="Department Dashboard — ISMO" description="Department Level Overview" />
      <PageBreadcrumb pageTitle="Department Dashboard" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4
                      flex flex-wrap items-center gap-3">

        {showPicker ? (
          <SubSectionPicker
            options={allowedSubs}
            selected={selectedIds}
            onChange={handleSubChange}
            disabled={loading}
          />
        ) : (
          data && (
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg
                            text-xs font-semibold text-blue-700">
              📍 {data.sub_section_names?.[0] ?? "Your Sub-Section"}
            </div>
          )
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">From</span>
          <input type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs
                       focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">To</span>
          <input type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs
                       focus:outline-none focus:border-blue-400" />
        </div>
        <button onClick={handleApply} disabled={loading}
          className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50
                     text-white text-xs font-semibold rounded-lg transition
                     flex items-center gap-1">
          🔄 Apply
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-400">
            <div className="inline-block w-8 h-8 border-4 border-blue-200
                            border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading dashboard...</p>
          </div>
        </div>

      ) : !data ? (
        <div className="text-center py-16 text-gray-400">Koi data nahi mila</div>

      ) : selectedIds.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-2">📍</div>
          <p className="text-sm">Koi sub-section select nahi kiya — upar se choose karein</p>
        </div>

      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
            <KpiCard label="Total Employees"   value={data.total_employees}      icon="👥" color="blue"
              sub={selectedIds.length > 1 ? `${selectedIds.length} sub-sections` : "In sub-section"} />
            <KpiCard label="Total Activities"  value={data.total_activities}     icon="📝" color="teal"
              sub={`${dateFrom} → ${dateTo}`} />
            <KpiCard label="Total BP Tasks"    value={data.total_bp_tasks}       icon="📋" color="orange"
              sub="Section level (L1+L2+L3)" />
            <KpiCard label="Completed Tasks"   value={data.completed_tasks}      icon="🎯" color="green"
              sub="100% complete" />
            <KpiCard label="In-Progress Tasks" value={data.inprogress_tasks}     icon="⚙️" color="indigo"
              sub="1%–99% complete" />
            <KpiCard label="Risks Encountered" value={data.risks_encountered}    icon="⚠️" color="red"
              sub="Activities with risk" />
            <KpiCard label="Avg BP Completion" value={`${data.avg_completion}%`} icon="📈" color="purple"
              sub="Avg across all BP tasks" />
          </div>

          {/* ── Charts Row ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            {/* 7-Day Bar Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">7-Day Activity Overview</h3>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                  LAST 7 DAYS
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.seven_days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#78909c" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#78909c" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e0e0e0" }}
                    labelStyle={{ fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="activities" name="Activities Entered"
                    fill="rgba(21,101,192,0.8)"  radius={[4,4,0,0]} />
                  <Bar dataKey="risks"      name="Risks Encountered"
                    fill="rgba(198,40,40,0.75)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* BP Status Pie */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">BP Task Status</h3>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                  {selectedIds.length > 1 ? `${selectedIds.length} SUB-SECTIONS` : "SUB-SECTION"}
                </span>
              </div>

              {data.total_bp_tasks === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  No BP Tasks found for this section
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <PieChart width={180} height={180}>
                        <Pie data={pieData} cx={90} cy={90}
                          innerRadius={55} outerRadius={80}
                          dataKey="value" startAngle={90} endAngle={-270}>
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center
                                      justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-800">{data.total_bp_tasks}</span>
                        <span className="text-xs text-gray-400">Total</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Completed",   value: data.completed_tasks,  color: "#2e7d32" },
                      { label: "In Progress", value: data.inprogress_tasks, color: "#1565c0" },
                      { label: "Not Started", value: data.not_started,      color: "#90a4ae" },
                    ].map(item => {
                      const pct = data.total_bp_tasks
                        ? Math.round(item.value / data.total_bp_tasks * 100) : 0;
                      return (
                        <div key={item.label}
                          className="flex items-center justify-between py-1.5
                                     border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm flex-shrink-0"
                              style={{ background: item.color }} />
                            <span className="text-xs font-medium text-gray-700">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: item.color }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: item.color }}>
                              {item.value}
                              <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Sub-Section Breakdown Table ──────────────────── */}
          {data.subsection_breakdown.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-bold text-gray-800 mb-4">
                Sub-Section Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500 font-semibold">Sub-Section</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-semibold">Section</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-semibold">Employees</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-semibold">Activities</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-semibold">Risks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subsection_breakdown.map((row, idx) => (
                      <tr key={row.sub_section_id}
                        className={`border-b border-gray-50 hover:bg-blue-50 transition-colors
                                    ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">
                          {row.sub_section_name}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{row.section_name}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold">
                            {row.total_employees}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-semibold">
                            {row.total_activities}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold
                            ${row.risks > 0
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-50 text-gray-400"}`}>
                            {row.risks}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Avg Completion Bar ───────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">
                Overall BP Completion
                {data.sub_section_names?.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({data.sub_section_names.join(", ")})
                  </span>
                )}
              </h3>
              <span className="text-2xl font-bold text-blue-700">{data.avg_completion}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${data.avg_completion}%`,
                  background: data.avg_completion >= 75 ? "#2e7d32"
                    : data.avg_completion >= 40 ? "#1565c0"
                    : "#f57c00",
                }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
