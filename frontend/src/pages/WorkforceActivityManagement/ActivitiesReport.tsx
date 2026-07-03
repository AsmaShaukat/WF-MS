import { useState, useEffect, useCallback, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */
interface ReportRow {
  id: number;
  erp_id: number;
  employee_name: string;
  bp_task__sr_number: string;
  bp_task__task: string;
  bp_task__section__name: string;
  bp_task__start_date: string;
  bp_task__end_date: string;
  task_description: string;
  risk_comment: string;
  activity_date: string;
  today_progress: number;
  overall_pct: number;
  status: "In Progress" | "Completed" | "Pending" | "Blocked";
}

interface Employee {
  erp_id: number;
  name: string;
  grade_id: number;
  sub_section_id: number | null;
}

interface SubSection {
  id: number;
  sub_section_name: string;
  head_employee_id: number | string;
  section_id: number;
}

/* ═══════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════ */
const STATUS_COLORS: Record<string, string> = {
  "Completed":   "bg-green-100 text-green-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Pending":     "bg-yellow-100 text-yellow-800",
  "Blocked":     "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════
   MULTI-SELECT DROPDOWN COMPONENT
═══════════════════════════════════════ */
interface MultiSelectDropdownProps {
  options: SubSection[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  disabled?: boolean;
  placeholder?: string;
}

function MultiSelectDropdown({ options, selected, onChange, disabled = false, placeholder = "Select Departments" }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOption = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const toggleAll = () => {
    if (selected.size === options.length) {
      onChange(new Set());
    } else {
      onChange(new Set(options.map(o => String(o.id))));
    }
  };

  const label = () => {
    if (selected.size === 0) return placeholder;
    if (selected.size === options.length) return "All Departments";
    if (selected.size === 1) {
      const found = options.find(o => selected.has(String(o.id)));
      return found?.sub_section_name ?? "1 selected";
    }
    return `${selected.size} Departments`;
  };

  if (disabled && options.length === 1) {
    // Grade-9 head with only 1 sub_section — show locked
    return (
      <div className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-100 text-gray-600 min-w-[160px] cursor-not-allowed">
        {options[0]?.sub_section_name ?? "—"}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-[160px]">
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <span className="truncate text-gray-700">{label()}</span>
        <span className="ml-1 text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-full max-h-60 overflow-y-auto">
          {/* Select All */}
          {options.length > 1 && (
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 font-semibold text-blue-700">
              <input
                type="checkbox"
                checked={selected.size === options.length}
                onChange={toggleAll}
                className="accent-blue-700"
              />
              All Departments
            </label>
          )}
          {options.map(ss => (
            <label key={ss.id} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-gray-700">
              <input
                type="checkbox"
                checked={selected.has(String(ss.id))}
                onChange={() => toggleOption(String(ss.id))}
                className="accent-blue-700"
              />
              {ss.sub_section_name}
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
export default function ActivitiesReport() {
  const user        = JSON.parse(localStorage.getItem("user") || "{}");
  const gradeId     = user?.grade_id     ?? 0;
  const sectionId   = user?.section_id   ?? 0;
  const erpId       = user?.erpid ?? 0;
  const isSuperuser = user?.is_superuser ?? false;

  /* ── State ── */
  const [rows,         setRows]         = useState<ReportRow[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [subSections,  setSubSections]  = useState<SubSection[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [initialized,  setInitialized]  = useState(false);

  /* Filters */
  const [filterErpid,          setFilterErpid]          = useState("");
  // Multi-select: Set of selected sub_section id strings
  const [selectedSubSections,  setSelectedSubSections]  = useState<Set<string>>(new Set());
  const [dateFrom,              setDateFrom]             = useState("");
  const [dateTo,                setDateTo]               = useState("");

  /* Pagination */
  const [page,    setPage]    = useState(1);
  const [perPage, setPerPage] = useState(10);

  /* Ref to track auto-selected sub_section for grade-9 head */
  const mySubSectionRef = useRef<SubSection | null>(null);

  /* ──────────────────────────────────────
     Access-level derived values
  ────────────────────────────────────── */
  const mySubSection  = gradeId === 9 ? (subSections[0] ?? null) : null;
  const isGrade9Head  = gradeId === 9 &&
                        mySubSection !== null &&
                        Number(mySubSection.head_employee_id) === Number(erpId);

  // Grade-9 head with multiple sub_sections (rare but possible)
  const isGrade9MultiHead = isGrade9Head && subSections.length > 1;

  // Show dropdown only if user has access to multiple sub_sections
  const showSubSectionDropdown =
    isSuperuser || [10, 11].includes(gradeId) ||
    isGrade9MultiHead ||
    (isGrade9Head && subSections.length === 1); // show locked single too

  const showEmployeeDropdown =
    isSuperuser || [10, 11].includes(gradeId) || isGrade9Head;

  // Attendance Report button: sirf section-heads (grade-9 head),
  // grade-10/11 aur superuser ko dikhta hai — individual employee
  // (jo kisi sub_section ka head nahi hai) ko yeh button show nahi hota.
  const canViewAttendanceReport =
    isSuperuser || [10, 11].includes(gradeId) || isGrade9Head;

  /* ── Visible sub-sections in dropdown ── */
  const visibleSubSections: SubSection[] =
    isSuperuser || [10, 11].includes(gradeId)
      ? subSections
      : isGrade9Head
        ? subSections   // All sub_sections returned for this head
        : [];

  /* ── Visible employees (filtered by selected sub_sections) ── */
  // Employee dropdown is always dependent on sub_section selection.
  // No sub_section selected → empty list (for all roles including grade 10/11).
  const visibleEmployees: Employee[] = (() => {
    if (selectedSubSections.size > 0) {
      return allEmployees.filter(
        e => e.sub_section_id !== null && selectedSubSections.has(String(e.sub_section_id))
      );
    }
    // Grade-9 head with single locked sub_section — auto-show their employees
    if (isGrade9Head && mySubSection && !isGrade9MultiHead) {
      return allEmployees.filter(e => Number(e.sub_section_id) === Number(mySubSection.id));
    }
    // No department selected → no employees shown
    return [];
  })();

  /* ─────────────────────────────────────
     fetchReport
  ───────────────────────────────────── */
  const fetchReport = useCallback(async (overrideSubSections?: Set<string>) => {
    setLoading(true);
    try {
      const activeSubs = overrideSubSections !== undefined ? overrideSubSections : selectedSubSections;

      const params = new URLSearchParams({
        section_id:   String(sectionId),
        grade_id:     String(gradeId),
        is_superuser: String(isSuperuser),
        erp_id:       String(erpId),
      });

      if (filterErpid) params.append("filter_erp_id", filterErpid);
      if (dateFrom)    params.append("date_from",  dateFrom);
      if (dateTo)      params.append("date_to",    dateTo);

      // Send multiple sub_section_ids
      if (activeSubs.size > 0) {
        activeSubs.forEach(id => params.append("sub_section_id", id));
      } else if (gradeId === 9 && mySubSectionRef.current && !isGrade9MultiHead) {
        params.append("sub_section_id", String(mySubSectionRef.current.id));
      }

      const res = await axios.get(`/activities/report/?${params}`);
      setRows(res.data);
      setPage(1);
    } catch {
      toast.error("Report load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, [sectionId, gradeId, isSuperuser, erpId, filterErpid, selectedSubSections, dateFrom, dateTo, isGrade9MultiHead]);

  /* ─────────────────────────────────────
     fetchSubSections
  ───────────────────────────────────── */
  const fetchSubSections = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        section_id:   String(sectionId),
        grade_id:     String(gradeId),
        erp_id:       String(erpId),
        is_superuser: String(isSuperuser),
      });
      const res = await axios.get(`/activities/sub-sections/?${params}`);
      const data: SubSection[] = res.data;
      setSubSections(data);

      let autoSubSections = new Set<string>();

      // Grade-9 head: auto-select their sub_section(s)
      if (gradeId === 9) {
        const myHeads = data.filter(
          (ss: SubSection) => Number(ss.head_employee_id) === Number(erpId)
        );
        if (myHeads.length > 0) {
          mySubSectionRef.current = myHeads[0];
          // For single head, auto-select; for multi, start with all selected
          autoSubSections = new Set(myHeads.map(ss => String(ss.id)));
          setSelectedSubSections(autoSubSections);
        }
      }

      setInitialized(true);
      return autoSubSections;
    } catch {
      console.error("Sub-sections fetch failed");
      setInitialized(true);
      return new Set<string>();
    }
  }, [sectionId, gradeId, erpId, isSuperuser]);

  /* ─────────────────────────────────────
     fetchEmployees
  ───────────────────────────────────── */
  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        section_id:   String(sectionId),
        grade_id:     String(gradeId),
        erp_id:       String(erpId),
        is_superuser: String(isSuperuser),
      });
      const res = await axios.get(`/activities/section-employees/?${params}`);
      setAllEmployees(res.data);
    } catch {
      console.error("Employees fetch failed");
    }
  }, [sectionId, gradeId, erpId, isSuperuser]);

  /* ─────────────────────────────────────
     Init: sub-sections → employees → report
  ───────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const autoSubs = await fetchSubSections();
      await fetchEmployees();
      await fetchReport(autoSubs);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Sub-section change → reset employee filter */
  const handleSubSectionChange = (val: Set<string>) => {
    setSelectedSubSections(val);
    setFilterErpid("");
  };

  /* ── Export Excel ── */
  const exportExcel = () => {
    const wsData = [
      ["ISMO — Daily Activities Report"],
      [],
      ["Sr.", "Employee Name", "BP Task Sr.", "BP Task", "Section",
       "Description", "Comment/Risk", "Activity Date",
       "Today %", "Overall %", "Status", "Start Date", "End Date"],
      ...rows.map((r, i) => [
        i + 1, r.employee_name,
        r.bp_task__sr_number || "—", r.bp_task__task || "—",
        r.bp_task__section__name || "—",
        r.task_description, r.risk_comment || "—",
        r.activity_date, `${r.today_progress}%`, `${r.overall_pct}%`,
        r.status, r.bp_task__start_date || "—", r.bp_task__end_date || "—",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities Report");
    XLSX.writeFile(wb, `activities_report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  /* ── Open Attendance Report in new tab ── */
  const openAttendanceReport = () => {
    const qp = new URLSearchParams({
      section_id:   String(sectionId),
      grade_id:     String(gradeId),
      erp_id:       String(erpId),
      is_superuser: String(isSuperuser),
    });
    window.open(`/business-plan/attendance-report?${qp}`, "_blank");
  };

  /* ── Access Info banner ── */
  const accessInfo = () => {
    if (isSuperuser)         return "Showing: All employees (Superuser)";
    if (gradeId === 11)      return "Showing: All sub-sections in your section (Grade 11)";
    if (gradeId === 10)      return "Showing: All sub-sections in your section (Grade 10)";
    if (isGrade9Head)        return `Showing: Your sub-section(s) — ${subSections.map(s => s.sub_section_name).join(", ")} (Grade 9 — Sub-section Head)`;
    if (gradeId === 9)       return "Showing: Your own activities only (Grade 9)";
    return "Showing: Your own activities only";
  };

  /* ── Pagination ── */
  const totalPages = Math.ceil(rows.length / perPage);
  const pageSlice  = rows.slice((page - 1) * perPage, page * perPage);

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <>
      <PageMeta title="Daily Activities Report — ISMO" description="Activities Report" />
      <PageBreadcrumb pageTitle="Daily Activities Report" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      <ComponentCard title="Daily Activities Report">

        {/* Access Info */}
        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
          ℹ️ {accessInfo()}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">

          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition">
            📊 Excel
          </button>

          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition">
            🖨️
          </button>

          {canViewAttendanceReport && (
            <button onClick={openAttendanceReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition">
              📋 Attendance Report
            </button>
          )}

          <div className="flex-1" />

          {/* Per page */}
          <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
            {[10, 25, 50, 100].map(n => (
              <option key={n} value={n}>{n} entries</option>
            ))}
          </select>

          {/* ── Department / Sub-section Multi-Select Dropdown ── */}
          {showSubSectionDropdown && (
            <MultiSelectDropdown
              options={visibleSubSections}
              selected={selectedSubSections}
              onChange={handleSubSectionChange}
              disabled={isGrade9Head && !isGrade9MultiHead}
              placeholder="Select Departments"
            />
          )}

          {/* ── Employee Dropdown ── */}
          {showEmployeeDropdown && (
            <select
              value={filterErpid}
              onChange={e => setFilterErpid(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none min-w-[150px]"
            >
              <option value="">All Employees</option>
              {visibleEmployees.map(e => (
                <option key={e.erp_id} value={e.erp_id}>{e.name}</option>
              ))}
            </select>
          )}

          {/* Date From */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="font-medium">From</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="font-medium">To</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          {/* Search */}
          <button
            onClick={() => fetchReport()}
            disabled={!initialized}
            className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
            Search
          </button>
        </div>

        {/* Records count */}
        <div className="mb-2 text-xs text-gray-400">{rows.length} records found</div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-100 text-blue-900">
                {["Sr.", "Employee Name", "BP Task", "Description",
                  "Comment/Risk", "Activity Date", "Today %",
                  "Overall %", "Status", "Start Date", "End Date"
                ].map(h => (
                  <th key={h} className="border border-blue-200 px-2 py-2 text-center font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-gray-400">
                    <div className="inline-block w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-gray-400">No record found</td>
                </tr>
              ) : pageSlice.map((r, i) => {
                const absIdx = (page - 1) * perPage + i;
                return (
                  <tr key={r.id}
                    className={`${absIdx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>

                    <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-500">
                      {absIdx + 1}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 font-semibold text-gray-800 whitespace-nowrap">
                      {r.employee_name}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5">
                      <div className="font-semibold text-blue-700">{r.bp_task__sr_number || "—"}</div>
                      <div className="text-gray-600">{r.bp_task__task || "—"}</div>
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-gray-600 max-w-[160px]">
                      <span className="break-words">{r.task_description}</span>
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-gray-500 max-w-[120px]">
                      <span className="break-words">{r.risk_comment || "—"}</span>
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center whitespace-nowrap">
                      {r.activity_date}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-blue-700">
                      {r.today_progress}%
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-10">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${r.overall_pct}%` }} />
                        </div>
                        <span className="font-semibold text-green-700">{r.overall_pct}%</span>
                      </div>
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500 whitespace-nowrap">
                      {r.bp_task__start_date || "—"}
                    </td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500 whitespace-nowrap">
                      {r.bp_task__end_date || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Showing {rows.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, rows.length)} of {rows.length}
          </span>
          <div className="flex gap-1 flex-wrap">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50">
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 border rounded text-xs ${p === page ? "bg-blue-700 text-white border-blue-700" : "border-gray-300 hover:bg-gray-50"}`}>
                  {p}
                </button>
              ) : null;
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50">
              Next →
            </button>
          </div>
        </div>

      </ComponentCard>
    </>
  );
}
