import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */
interface EmployeeProgress {
  erp_id: number;
  employee_name: string;
  overall_pct: number;
  status: string;
  activity_date: string;
}

interface SubTask {
  id: number;
  sr_number: string;
  level: number;
  task: string;
  lead_team_name: string | null;
  start_date: string | null;
  end_date: string | null;
  completion_pct: number;
  employees: EmployeeProgress[];
}

interface MainTaskReportRow {
  id: number;
  sr_number: string;
  task: string;
  section_name: string | null;
  lead_team_name: string | null;
  start_date: string | null;
  end_date: string | null;
  overall_completion_pct: number;
  total_sub_tasks: number;
  sub_tasks: SubTask[];
  employees: EmployeeProgress[];
}

/* ═══════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════ */
function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "bg-green-600" : pct >= 50 ? "bg-blue-600" : "bg-orange-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden w-20">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="font-semibold text-gray-700 text-xs whitespace-nowrap">{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function MainTaskReport() {
  const [params] = useSearchParams();
  const sectionId = params.get("section_id") || "0";
  const isSuperuser = params.get("is_superuser") || "false";
  const gradeId = params.get("grade_id") || "0";
  const erpId = params.get("erp_id") || "0";

  const [data, setData] = useState<MainTaskReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [denied, setDenied] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/businessplan/main-task-report/?section_id=${sectionId}&is_superuser=${isSuperuser}&grade_id=${gradeId}&erp_id=${erpId}`,
        { headers: { "X-Grade-Id": gradeId, "X-Erp-Id": erpId } }
      );
      setData(res.data);
      // By default, expand all main tasks so the full detail is visible
      setExpandedIds(new Set(res.data.map((r: MainTaskReportRow) => r.id)));
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setDenied(true);
      } else {
        toast.error("Report load karne mein masla hua.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredData = data.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.task.toLowerCase().includes(q) ||
      r.sr_number.toLowerCase().includes(q) ||
      r.sub_tasks.some((s) => s.task.toLowerCase().includes(q) || s.sr_number.toLowerCase().includes(q))
    );
  });

  /* ── Excel Export ── */
  const exportExcel = () => {
    const wsData: any[] = [
      ["ISMO — Main Task Comprehensive Report"],
      [],
      [
        "Main Task Sr.", "Main Task", "Section", "Overall Progress %",
        "Total Sub-Tasks", "", "Sub-Task Sr.", "Sub-Task", "Sub-Task Lead",
        "Sub-Task Completion %", "Employee", "Employee Progress %", "Employee Status", "Activity Date",
      ],
    ];

    filteredData.forEach((main) => {
      if (main.sub_tasks.length === 0) {
        wsData.push([
          main.sr_number, main.task, main.section_name || "",
          `${main.overall_completion_pct}%`, main.total_sub_tasks,
          "", "", "", "", "", "", "", "", "",
        ]);
      } else {
        main.sub_tasks.forEach((sub, subIdx) => {
          if (sub.employees.length === 0) {
            wsData.push([
              subIdx === 0 ? main.sr_number : "",
              subIdx === 0 ? main.task : "",
              subIdx === 0 ? main.section_name || "" : "",
              subIdx === 0 ? `${main.overall_completion_pct}%` : "",
              subIdx === 0 ? main.total_sub_tasks : "",
              "",
              sub.sr_number, sub.task, sub.lead_team_name || "",
              `${sub.completion_pct}%`, "", "", "", "",
            ]);
          } else {
            sub.employees.forEach((emp, empIdx) => {
              wsData.push([
                subIdx === 0 && empIdx === 0 ? main.sr_number : "",
                subIdx === 0 && empIdx === 0 ? main.task : "",
                subIdx === 0 && empIdx === 0 ? main.section_name || "" : "",
                subIdx === 0 && empIdx === 0 ? `${main.overall_completion_pct}%` : "",
                subIdx === 0 && empIdx === 0 ? main.total_sub_tasks : "",
                "",
                empIdx === 0 ? sub.sr_number : "",
                empIdx === 0 ? sub.task : "",
                empIdx === 0 ? sub.lead_team_name || "" : "",
                empIdx === 0 ? `${sub.completion_pct}%` : "",
                emp.employee_name, `${emp.overall_pct}%`, emp.status, emp.activity_date,
              ]);
            });
          }
        });
      }
      wsData.push([]); // blank row between main tasks
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Main Task Report");
    XLSX.writeFile(wb, "main_task_report.xlsx");
  };

  if (denied) {
    return (
      <>
        <PageMeta title="Main Task Report — ISMO" description="Comprehensive Main Task Progress Report" />
        <PageBreadcrumb pageTitle="Main Task Report" />
        <ComponentCard title="Main Task — Comprehensive Progress Report">
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium text-gray-500">🚫 Access Denied</p>
            <p className="text-sm mt-1">This Report is only accessible to section-heads (grade 9), grade 10/11 users, and superusers.</p>
          </div>
        </ComponentCard>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Main Task Report — ISMO" description="Comprehensive Main Task Progress Report" />
      <PageBreadcrumb pageTitle="Main Task Report" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      <ComponentCard title="Main Task — Comprehensive Progress Report">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search main task or sub-task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2
text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
          />
          <div className="hidden sm:flex flex-1" />
          <button
            onClick={exportExcel}
            className="w-full sm:w-auto flex items-center justify-center gap-2
px-4 py-2 bg-green-700 hover:bg-green-800 active:bg-green-900
text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            📊 Export Excel
          </button>
        </div>

        {!loading && (
          <div className="mb-2 text-xs text-gray-400">{filteredData.length} main tasks</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm font-medium">No Data Found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.map((main) => {
              const expanded = expandedIds.has(main.id);
              return (
                <div key={main.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Main task header */}
                  <button
                    onClick={() => toggleExpand(main.id)}
                    className="w-full flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 transition text-left"
                  >
                    <span className="text-gray-400 text-xs w-4">{expanded ? "▼" : "▶"}</span>
                    <span className="font-bold text-blue-800 text-sm whitespace-nowrap">{main.sr_number}</span>
                    <span className="font-semibold text-gray-800 text-sm flex-1 min-w-[200px]">{main.task}</span>
                    {main.section_name && (
                      <span className="text-xs px-2 py-0.5 bg-white border border-blue-200 rounded-full text-blue-700 whitespace-nowrap">
                        {main.section_name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {main.total_sub_tasks} sub-task{main.total_sub_tasks !== 1 ? "s" : ""}
                    </span>
                    <ProgressBar pct={main.overall_completion_pct} />
                  </button>

                  {/* Sub-task detail */}
                  {expanded && (
                    <div className="p-3 bg-white">
                      {main.sub_tasks.length === 0 && main.employees.length === 0 ? (
                        <p className="text-xs text-gray-400 px-2 py-3">This main task has no sub-tasks.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600">
                                <th className="border border-gray-200 px-2 py-2 text-left">Sub-Task Sr.</th>
                                <th className="border border-gray-200 px-2 py-2 text-left">Sub-Task</th>
                                <th className="border border-gray-200 px-2 py-2 text-left">Lead Team</th>
                                <th className="border border-gray-200 px-2 py-2 text-center">Sub-Task %</th>
                                <th className="border border-gray-200 px-2 py-2 text-left">Employee</th>
                                <th className="border border-gray-200 px-2 py-2 text-center">Employee %</th>
                                <th className="border border-gray-200 px-2 py-2 text-center">Status</th>
                                <th className="border border-gray-200 px-2 py-2 text-center">Last Update</th>
                              </tr>
                            </thead>
                            <tbody>
                              {main.sub_tasks.map((sub) => {
                                const empRows = sub.employees.length > 0 ? sub.employees : [null];
                                return empRows.map((emp, idx) => (
                                  <tr key={`${sub.id}-${idx}`} className="hover:bg-blue-50">
                                    {idx === 0 && (
                                      <>
                                        <td
                                          className="border border-gray-200 px-2 py-1.5 font-semibold text-blue-700 align-top"
                                          rowSpan={empRows.length}
                                          style={{ paddingLeft: `${8 + sub.level * 12}px` }}
                                        >
                                          {sub.sr_number}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-gray-800 align-top" rowSpan={empRows.length}>
                                          {sub.task}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-gray-500 align-top" rowSpan={empRows.length}>
                                          {sub.lead_team_name || "—"}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-center align-top" rowSpan={empRows.length}>
                                          <ProgressBar pct={sub.completion_pct} />
                                        </td>
                                      </>
                                    )}
                                    {emp ? (
                                      <>
                                        <td className="border border-gray-200 px-2 py-1.5 text-gray-700">{emp.employee_name}</td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-green-700">
                                          {emp.overall_pct}%
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-600">{emp.status}</td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500 whitespace-nowrap">
                                          {emp.activity_date}
                                        </td>
                                      </>
                                    ) : (
                                      <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-400" colSpan={4}>
                                        No activity logs found
                                      </td>
                                    )}
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ComponentCard>
    </>
  );
}
