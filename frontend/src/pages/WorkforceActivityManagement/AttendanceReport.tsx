import { useEffect, useState, useCallback } from "react";
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
interface AttendanceEmployee {
  erp_id: number;
  name: string;
  active: boolean;
}

interface AttendanceSection {
  sub_section_id: number;
  sub_section_name: string;
  total_count: number;
  active_count: number;
  inactive_count: number;
  employees: AttendanceEmployee[];
}

interface AttendanceReportResponse {
  date: string;
  sections: AttendanceSection[];
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function AttendanceReport() {
  const [params] = useSearchParams();
  const sectionId   = params.get("section_id")   || "0";
  const gradeId     = params.get("grade_id")     || "0";
  const erpId       = params.get("erp_id")       || "0";
  const isSuperuser = params.get("is_superuser") || "false";

  const [date, setDate]           = useState(todayStr());
  const [data, setData]           = useState<AttendanceSection[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  /* ── Fetch report for selected date ── */
  const fetchReport = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await axios.get<AttendanceReportResponse>(
        `/activities/attendance-report/?section_id=${sectionId}&grade_id=${gradeId}&erp_id=${erpId}&is_superuser=${isSuperuser}&date=${d}`
      );
      setData(res.data.sections || []);
      // Expand all sections by default
      setExpandedIds(new Set((res.data.sections || []).map(s => s.sub_section_id)));
    } catch {
      toast.error("Attendance report load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, [sectionId, gradeId, erpId, isSuperuser]);

  useEffect(() => { fetchReport(date); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = (d: string) => {
    setDate(d);
    fetchReport(d);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Totals across all sections ── */
  const grandTotal    = data.reduce((s, sec) => s + sec.total_count, 0);
  const grandActive   = data.reduce((s, sec) => s + sec.active_count, 0);
  const grandInactive = data.reduce((s, sec) => s + sec.inactive_count, 0);

  /* ── Export Excel ── */
  const exportExcel = () => {
    const wsData: any[] = [
      ["ISMO — Daily Attendance / Activity Status Report"],
      [`Date: ${date}`],
      [],
      ["Department / Section", "Employee", "Status"],
    ];
    data.forEach(sec => {
      if (sec.employees.length === 0) {
        wsData.push([sec.sub_section_name, "—", "—"]);
      } else {
        sec.employees.forEach((e, idx) => {
          wsData.push([
            idx === 0 ? sec.sub_section_name : "",
            e.name,
            e.active ? "Active (activity entered)" : "Inactive (no activity)",
          ]);
        });
      }
      wsData.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `attendance_report_${date}.xlsx`);
  };

  return (
    <>
      <PageMeta title="Attendance / Activity Status Report — ISMO" description="Daily Activity Attendance Report" />
      <PageBreadcrumb pageTitle="Attendance / Activity Status Report" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      <ComponentCard title="Daily Attendance — Activity Status Report">

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-semibold">Date</span>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => handleDateChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={() => fetchReport(date)}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            🔄 Refresh
          </button>

          <div className="hidden sm:flex flex-1" />

          <button
            onClick={exportExcel}
            disabled={loading || data.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white text-xs sm:text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            📊 Export Excel
          </button>

          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            🖨️ Print
          </button>
        </div>

        {/* ── Summary strip ── */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
              <div className="text-lg font-bold text-gray-800">{grandTotal}</div>
              <div className="text-xs text-gray-500">Total Employees</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <div className="text-lg font-bold text-green-700">{grandActive}</div>
              <div className="text-xs text-green-700">Active (Activity Entered)</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
              <div className="text-lg font-bold text-red-700">{grandInactive}</div>
              <div className="text-xs text-red-700">Inactive (No Activity)</div>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm font-medium">Is date ke liye koi data nahi mila.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map(sec => {
              const expanded = expandedIds.has(sec.sub_section_id);
              const pct = sec.total_count > 0 ? Math.round((sec.active_count / sec.total_count) * 100) : 0;
              return (
                <div key={sec.sub_section_id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Section header */}
                  <button
                    onClick={() => toggleExpand(sec.sub_section_id)}
                    className="w-full flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 transition text-left"
                  >
                    <span className="text-gray-400 text-xs w-4">{expanded ? "▼" : "▶"}</span>
                    <span className="font-semibold text-gray-800 text-sm flex-1 min-w-[160px]">{sec.sub_section_name}</span>

                    <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600 whitespace-nowrap">
                      {sec.total_count} employee{sec.total_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 border border-green-200 rounded-full text-green-700 whitespace-nowrap font-semibold">
                      ✓ {sec.active_count} Active
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-red-100 border border-red-200 rounded-full text-red-700 whitespace-nowrap font-semibold">
                      ✗ {sec.inactive_count} Inactive
                    </span>

                    <div className="flex items-center gap-2 min-w-[110px]">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden w-16">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-semibold text-gray-700 text-xs whitespace-nowrap">{pct}%</span>
                    </div>
                  </button>

                  {/* Employee detail */}
                  {expanded && (
                    <div className="p-3 bg-white">
                      {sec.employees.length === 0 ? (
                        <p className="text-xs text-gray-400 px-2 py-3">Is section mein koi employee nahi mila.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600">
                                <th className="border border-gray-200 px-2 py-2 text-left w-12">Sr.</th>
                                <th className="border border-gray-200 px-2 py-2 text-left">Employee</th>
                                <th className="border border-gray-200 px-2 py-2 text-center w-48">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.employees.map((e, i) => (
                                <tr key={e.erp_id} className="hover:bg-blue-50">
                                  <td className="border border-gray-200 px-2 py-1.5 text-gray-500">{i + 1}</td>
                                  <td className="border border-gray-200 px-2 py-1.5 font-medium text-gray-800">{e.name}</td>
                                  <td className="border border-gray-200 px-2 py-1.5 text-center">
                                    {e.active ? (
                                      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-800">
                                        ✓ Active — Activity Entered
                                      </span>
                                    ) : (
                                      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-800">
                                        ✗ Inactive — No Activity
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
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
