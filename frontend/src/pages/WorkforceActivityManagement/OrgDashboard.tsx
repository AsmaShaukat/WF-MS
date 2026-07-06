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

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */
interface Section { id: number; name: string; }

interface SubSectionOption { id: number; sub_section_name: string; }

interface SubBreakdown {
  sub_section_id:   number;
  sub_section_name: string;
  total_employees:  number;
  total_activities: number;
  total_bp_tasks:   number;
  risks:            number;
}

interface SectionData {
  section_id:        number;
  section_name:      string;
  total_employees:   number;
  total_activities:  number;
  total_bp_tasks:    number;
  completed_tasks:   number;
  inprogress_tasks:  number;
  not_started:       number;
  risks_encountered: number;
  avg_completion:    number;
}

interface Totals {
  total_employees:   number;
  total_activities:  number;
  total_bp_tasks:    number;
  completed_tasks:   number;
  inprogress_tasks:  number;
  not_started:       number;
  risks_encountered: number;
  avg_completion:    number;
}

interface DayData {
  date: string; day: string; activities: number; risks: number;
}

interface OrgData {
  all_sections:          Section[];
  selected_ids:          number[];
  available_subsections: SubSectionOption[];
  selected_sub_ids:      number[];
  subsection_breakdown:  SubBreakdown[];
  sections_data:   SectionData[];
  totals:          Totals;
  seven_days:      DayData[];
  dept_comparison: any[];
  date_from:       string;
  date_to:         string;
}

/* ═══════════════════════════════════════
   COLORS
═══════════════════════════════════════ */
const SECTION_COLORS = [
  "#1565c0","#2e7d32","#c62828","#e65100",
  "#6a1b9a","#00838f","#f57f17","#37474f",
];
const PIE_COLORS = ["#2e7d32","#1565c0","#90a4ae"];

/* ═══════════════════════════════════════
   KPI CARD
═══════════════════════════════════════ */
function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color: string; sub?: string;
}) {
  const border: Record<string, string> = {
    blue:   "border-blue-500   bg-blue-50",
    green:  "border-green-500  bg-green-50",
    orange: "border-orange-500 bg-orange-50",
    red:    "border-red-500    bg-red-50",
    purple: "border-purple-500 bg-purple-50",
    teal:   "border-teal-500   bg-teal-50",
    indigo: "border-indigo-500 bg-indigo-50",
  };
  const val: Record<string, string> = {
    blue:"text-blue-700", green:"text-green-700", orange:"text-orange-700",
    red:"text-red-700", purple:"text-purple-700", teal:"text-teal-700",
    indigo:"text-indigo-700",
  };
  return (
    <div className={`rounded-xl border-t-4 p-4 shadow-sm hover:shadow-md transition-shadow ${border[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-3xl font-bold ${val[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════
   DEPT DROPDOWN (multi-select)
═══════════════════════════════════════ */
function DeptDropdown({
  sections, selected, onChange,
}: {
  sections: Section[]; selected: number[]; onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(sections.map(s => s.id));
  const clearAll  = () => onChange([]);

  const label = selected.length === 0
    ? "No departments selected"
    : selected.length === sections.length
      ? "All Departments"
      : `${selected.length} department${selected.length > 1 ? "s" : ""} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white hover:border-blue-400 focus:outline-none min-w-[200px] justify-between"
      >
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[240px] max-h-72 overflow-y-auto">
          {/* Select All / Clear */}
          <div className="flex gap-2 p-2 border-b border-gray-100">
            <button onClick={selectAll}
              className="flex-1 text-xs py-1 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium">
              Select All
            </button>
            <button onClick={clearAll}
              className="flex-1 text-xs py-1 px-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded font-medium">
              Clear
            </button>
          </div>
          {sections.map(s => (
            <label key={s.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
                className="rounded accent-blue-600"
              />
              {s.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SUB-SECTION DROPDOWN (multi-select) — drill-down,
   sirf tab dikhta hai jab EXACTLY ek department selected ho
═══════════════════════════════════════ */
function SubSectionDropdown({
  options, selected, onChange,
}: {
  options: SubSectionOption[]; selected: number[]; onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  const selectAll = () => onChange(options.map(s => s.id));
  const clearAll  = () => onChange([]);

  const label = selected.length === 0
    ? "All Sub-Sections"
    : selected.length === options.length
      ? "All Sub-Sections"
      : `${selected.length} sub-section${selected.length > 1 ? "s" : ""} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white hover:border-blue-400 focus:outline-none min-w-[200px] justify-between"
      >
        <span className="text-blue-600">📍</span>
        <span className="text-gray-700 flex-1 text-left">{label}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[240px] max-h-72 overflow-y-auto">
          <div className="flex gap-2 p-2 border-b border-gray-100">
            <button onClick={selectAll}
              className="flex-1 text-xs py-1 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium">
              Select All
            </button>
            <button onClick={clearAll}
              className="flex-1 text-xs py-1 px-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded font-medium">
              Clear
            </button>
          </div>
          {options.map(s => (
            <label key={s.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
                className="rounded accent-blue-600"
              />
              {s.sub_section_name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function OrgDashboard() {
  const user        = JSON.parse(localStorage.getItem("user") || "{}");
  const gradeId     = user?.grade_id    ?? 0;
  const isSuperuser = user?.is_superuser ?? false;
  const ALLOWED     = [10, 11];
  const hasAccess   = isSuperuser || ALLOWED.includes(gradeId);
  const today       = new Date().toISOString().split("T")[0];

  const [data,         setData]         = useState<OrgData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [dateFrom,     setDateFrom]     = useState(today);
  const [dateTo,       setDateTo]       = useState(today);
  const [selectedIds,  setSelectedIds]  = useState<number[]>([]);
  const [allSections,  setAllSections]  = useState<Section[]>([]);
  const [initialized,  setInitialized]  = useState(false);
  const [availableSubs, setAvailableSubs] = useState<SubSectionOption[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([]);

  const fetchData = useCallback(async (secIds?: number[], subIds?: number[]) => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const ids = secIds ?? selectedIds;
      const subIdsToSend = subIds ?? selectedSubIds;
      const params = new URLSearchParams({
        grade_id:     String(gradeId),
        is_superuser: String(isSuperuser),
        date_from:    dateFrom,
        date_to:      dateTo,
        section_ids:  ids.join(','),
        sub_section_ids: subIdsToSend.join(','),
      });
      const res = await axios.get(`/dashboard/organization/?${params}`);
      const d: OrgData = res.data;
      setData(d);
      setAvailableSubs(d.available_subsections ?? []);
      setSelectedSubIds(d.selected_sub_ids ?? []);
      if (!initialized) {
        setAllSections(d.all_sections);
        setSelectedIds(d.all_sections.map(s => s.id));
        setInitialized(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Dashboard load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, [hasAccess, gradeId, isSuperuser, dateFrom, dateTo, selectedIds, selectedSubIds, initialized]);

  useEffect(() => { fetchData(); }, []);

  /* No access */
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm font-medium">Access Denied</p>
          <p className="text-xs mt-1">Org Dashboard is only accessable to Grade 10/11</p>
        </div>
      </div>
    );
  }

  const totals = data?.totals;

  /* Pie chart data */
  const pieData = totals ? [
    { name: "Completed",   value: totals.completed_tasks },
    { name: "In Progress", value: totals.inprogress_tasks },
    { name: "Not Started", value: totals.not_started },
  ] : [];

  return (
    <>
      <PageMeta title="Organization Dashboard — ISMO" description="Org Level Overview" />
      <PageBreadcrumb pageTitle="Organization Dashboard" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      {/* ── Toolbar ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        {/* Dept Multi-select */}
        <DeptDropdown
          sections={allSections}
          selected={selectedIds}
          onChange={(ids) => {
            setSelectedIds(ids);
            if (ids.length !== 1) setSelectedSubIds([]); // drill-down sirf single-section view mein lagu hai
          }}
        />

        {/* Sub-Section drill-down — sirf tab dikhta hai jab EXACTLY ek department selected ho aur uski sub-sections hon */}
        {selectedIds.length === 1 && availableSubs.length > 0 && (
          <SubSectionDropdown
            options={availableSubs}
            selected={selectedSubIds}
            onChange={setSelectedSubIds}
          />
        )}

        <div className="flex-1" />

        {/* Date filters */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        </div>
        <button onClick={() => fetchData()}
          className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1">
          🔄 Apply
        </button>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-400">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading dashboard...</p>
          </div>
        </div>
      ) : !data || !totals ? (
        <div className="text-center py-16 text-gray-400"><p>No data found</p></div>
      ) : (
        <>
          {/* ── Overall KPI Cards ── */}
          <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            Overall Summary — {selectedIds.length} Department{selectedIds.length !== 1 ? "s" : ""}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
            <KpiCard label="Total Employees"   value={totals.total_employees}   icon="👥" color="blue"   sub="Selected depts" />
            <KpiCard label="Total Activities"  value={totals.total_activities}  icon="📝" color="teal"   sub={`${dateFrom} — ${dateTo}`} />
            <KpiCard label="Total BP Tasks"    value={totals.total_bp_tasks}    icon="📋" color="orange" sub="All levels" />
            <KpiCard label="Completed"         value={totals.completed_tasks}   icon="🎯" color="green"  sub="100% done" />
            <KpiCard label="In Progress"       value={totals.inprogress_tasks}  icon="⚙️" color="indigo" sub="1-99%" />
            <KpiCard label="Risks"             value={totals.risks_encountered} icon="⚠️" color="red"    sub="Activities with risk" />
            <KpiCard label="Avg Completion"    value={`${totals.avg_completion}%`} icon="📈" color="purple" sub="Across all tasks" />
          </div>

          {/* ── Charts Row 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            {/* 7-Day Overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">7-Day Activity Overview</h3>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">LAST 7 DAYS</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.seven_days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#78909c" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#78909c" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="activities" name="Activities" fill="rgba(21,101,192,0.8)" radius={[4,4,0,0]} />
                  <Bar dataKey="risks"      name="Risks"      fill="rgba(198,40,40,0.75)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Overall BP Status Pie */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Overall BP Task Status</h3>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">ALL DEPTS</span>
              </div>
              {totals.total_bp_tasks === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No BP Tasks</div>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <PieChart width={180} height={180}>
                        <Pie data={pieData} cx={90} cy={90} innerRadius={55} outerRadius={80}
                          dataKey="value" startAngle={90} endAngle={-270}>
                          {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-800">{totals.total_bp_tasks}</span>
                        <span className="text-xs text-gray-400">Total</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Completed",   value: totals.completed_tasks,  color: "#2e7d32" },
                      { label: "In Progress", value: totals.inprogress_tasks, color: "#1565c0" },
                      { label: "Not Started", value: totals.not_started,      color: "#90a4ae" },
                    ].map(item => {
                      const pct = totals.total_bp_tasks > 0
                        ? Math.round(item.value / totals.total_bp_tasks * 100) : 0;
                      return (
                        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                            <span className="text-xs font-medium text-gray-700">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: item.color }}>
                              {item.value} <span className="text-gray-400 font-normal">({pct}%)</span>
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

          {/* ── Charts Row 2 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            {/* Department Comparison Bar Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Department Comparison</h3>
                <span className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded-full font-medium">ACTIVITIES</span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dept_comparison} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#78909c" }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#78909c" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="activities" name="Activities"  fill="#1565c0" radius={[4,4,0,0]} />
                  <Bar dataKey="risks"      name="Risks"       fill="#c62828" radius={[4,4,0,0]} />
                  <Bar dataKey="employees"  name="Employees"   fill="#2e7d32" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* BP Completion by Department */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">BP Completion by Department</h3>
                <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full font-medium">AVG %</span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dept_comparison} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#455a64" }} width={55} />
                  <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="bp_completion" name="Avg Completion" radius={[0,4,4,0]}>
                    {data.dept_comparison.map((_, idx) => (
                      <Cell key={idx} fill={SECTION_COLORS[idx % SECTION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Radar Chart ──
          {data.dept_comparison.length > 2 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Department Performance Radar</h3>
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full font-medium">OVERVIEW</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={data.dept_comparison}>
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#455a64" }} />
                  <Radar name="Activities"   dataKey="activities"   stroke="#1565c0" fill="#1565c0" fillOpacity={0.2} />
                  <Radar name="Completion %" dataKey="bp_completion" stroke="#2e7d32" fill="#2e7d32" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )} */}

          {/* ── Per-Section Table ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Department Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-100 text-blue-900">
                    {["Department","Employees","Activities","BP Tasks","Completed","In Progress","Not Started","Risks","Avg Completion"].map(h => (
                      <th key={h} className="border border-blue-200 px-2 py-2 text-center font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sections_data.map((s, i) => (
                    <tr key={s.section_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-2 py-1.5 font-semibold text-blue-700">{s.section_name}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{s.total_employees}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{s.total_activities}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{s.total_bp_tasks}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-green-700 font-semibold">{s.completed_tasks}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-blue-700">{s.inprogress_tasks}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500">{s.not_started}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-red-600">{s.risks_encountered}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-12">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${s.avg_completion}%` }} />
                          </div>
                          <span className="font-semibold text-blue-700">{s.avg_completion}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                    <td className="border border-gray-200 px-2 py-2 text-blue-800">TOTAL</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-blue-800">{totals.total_employees}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-blue-800">{totals.total_activities}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-blue-800">{totals.total_bp_tasks}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-green-700">{totals.completed_tasks}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-blue-700">{totals.inprogress_tasks}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-600">{totals.not_started}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-red-600">{totals.risks_encountered}</td>
                    <td className="border border-gray-200 px-2 py-2 text-center text-blue-800">{totals.avg_completion}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Overall Completion Bar ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">Overall Organization BP Completion</h3>
              <span className="text-2xl font-bold text-blue-700">{totals.avg_completion}%</span>
            </div>
            <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${totals.avg_completion}%`,
                  background: totals.avg_completion >= 75 ? "#2e7d32"
                    : totals.avg_completion >= 40 ? "#1565c0" : "#f57c00",
                }}
              />
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