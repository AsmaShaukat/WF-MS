import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */
interface BPTask {
  id: number;
  sr_number: string;
  task: string;
  department: string;
  start_date: string | null;
  end_date: string | null;
  completion_pct: number;
}

/* sr_number pattern: "T-SO-01"=L1, "T-SO-01-01"=L2, "T-SO-01-01-01"=L3 */
function getLevel(sr: string): number {
  return sr.split("-").length - 2;
}
function getParentSr(sr: string): string {
  const parts = sr.split("-");
  return parts.slice(0, parts.length - 1).join("-");
}

interface ActivityRow {
  id: number;
  erp_id: number;
  bp_task_id: number | null;
  bp_task_sr: string;
  bp_task_name: string;
  bp_task_start_date: string | null;
  bp_task_end_date: string | null;
  task_description: string;
  risk_comment: string;
  activity_date: string;
  today_progress: number;
  overall_pct: number;
  status: "In Progress" | "Completed" | "Pending" | "Blocked";
  created_at: string;
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

const ADMIN_GRADES = [9, 10, 11];
const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function EmpDailyActivities() {
  const user        = JSON.parse(localStorage.getItem("user") || "{}");
  const erpid       = user?.erpid      ?? 0;
  const gradeId     = user?.grade_id    ?? 0;
  const sectionId   = user?.section_id  ?? 0;
  const isSuperuser = user?.is_superuser ?? false;
  const isAdmin     = ADMIN_GRADES.includes(gradeId) || isSuperuser;
  const today       = new Date().toISOString().split("T")[0];

  /* ── State ── */
  const [bpTasks,    setBpTasks]    = useState<BPTask[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* Form */
  const [l1Id,        setL1Id]        = useState("");
  const [l2Id,        setL2Id]        = useState("");
  const [l3Id,        setL3Id]        = useState("");
  const [desc,        setDesc]        = useState("");
  const [risk,        setRisk]        = useState("");
  const [actDate,     setActDate]     = useState(today);
  const [todayProg,   setTodayProg]   = useState("");
  const [overallPct,  setOverallPct]  = useState("");

  /* History filters */
  const [search,   setSearch]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [page,     setPage]     = useState(1);
  const [perPage,  setPerPage]  = useState(10);

  /* Edit */
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<ActivityRow>>({});

  /* ── Fetch BP Tasks ── */
  const fetchBpTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        section_id:   String(sectionId),
        grade_id:     String(gradeId),
        is_superuser: String(isSuperuser),
        erpid:        String(erpid),
      });
      const res = await axios.get(`/activities/bp-tasks/?${params}`);
      setBpTasks(res.data);
    } catch {
      toast.error("BP Tasks load karne mein masla hua.");
    }
  }, [sectionId, gradeId, isSuperuser, erpid]);

  /* ── Fetch Activities ── */
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/activities/my/?erp_id=${erpid}`);
      setActivities(res.data);
    } catch {
      toast.error("Activities load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, [erpid]);

  useEffect(() => {
    fetchBpTasks();
    fetchActivities();
  }, [fetchBpTasks, fetchActivities]);

  /* ── Hierarchical Dropdowns ── */
  const l1Tasks = bpTasks.filter(t => getLevel(t.sr_number) === 1);

  const selectedL1  = bpTasks.find(t => t.id === parseInt(l1Id));
  const l2Tasks     = bpTasks.filter(t => getLevel(t.sr_number) === 2 && getParentSr(t.sr_number) === selectedL1?.sr_number);

  const selectedL2  = bpTasks.find(t => t.id === parseInt(l2Id));
  const l3Tasks     = bpTasks.filter(t => getLevel(t.sr_number) === 3 && getParentSr(t.sr_number) === selectedL2?.sr_number);

  const selectedL3  = bpTasks.find(t => t.id === parseInt(l3Id));

  // Most specific selected task
  const selectedTask = selectedL3 || selectedL2 || selectedL1 || null;

  /* ── L1 Change — auto fill overall from BP ── */
  const handleL1Change = (id: string) => {
    setL1Id(id); setL2Id(""); setL3Id("");
    const t = bpTasks.find(t => t.id === parseInt(id));
    setOverallPct(t ? String(t.completion_pct) : "");
  };

  const handleL2Change = (id: string) => {
    setL2Id(id); setL3Id("");
    const t = bpTasks.find(t => t.id === parseInt(id));
    setOverallPct(t ? String(t.completion_pct) : overallPct);
  };

  const handleL3Change = (id: string) => {
    setL3Id(id);
    const t = bpTasks.find(t => t.id === parseInt(id));
    setOverallPct(t ? String(t.completion_pct) : overallPct);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!desc.trim() || !actDate) {
      toast.error("Task Description aur Activity Date zaroori hain!");
      return;
    }
    const bp_task_id = l3Id || l2Id || l1Id;
    // Calculate new overall_pct: current BP completion + today's progress (capped at 100)
    const currentPct = selectedTask?.completion_pct ?? 0;
    const todayNum   = parseInt(todayProg) || 0;
    const newOverall = Math.min(100, currentPct + todayNum);
    setSubmitting(true);
    try {
      const res = await axios.post("/activities/submit/", {
        erp_id: erpid,
        bp_task_id:       bp_task_id ? parseInt(bp_task_id) : null,
        task_description: desc,
        risk_comment:     risk,
        activity_date:    actDate,
        today_progress:   todayNum,
        overall_pct:      newOverall,
      });
      toast.success("Activity submit ho gayi!");
      // Form reset
      setL1Id(""); setL2Id(""); setL3Id("");
      setDesc(""); setRisk("");
      setActDate(today); setTodayProg(""); setOverallPct("");
      // Refresh both
      await Promise.all([fetchActivities(), fetchBpTasks()]);
      // Show updated overall
      if (res.data.overall_pct !== undefined) {
        toast.info(`BP Overall Completion: ${res.data.overall_pct}%`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Save Edit ── */
  const handleSaveEdit = async () => {
    if (!editId) return;
    try {
      // If today_progress changed, recalculate overall_pct from the linked BP task's current pct
      const original = activities.find(a => a.id === editId);
      let patchData = { ...editData };

      if (
        editData.today_progress !== undefined &&
        original &&
        editData.today_progress !== original.today_progress
      ) {
        // Find current BP completion from bpTasks (refreshed list)
        const linkedTask = bpTasks.find(t => t.id === original.bp_task_id);
        if (linkedTask) {
          // Remove old progress, add new progress
          const base = linkedTask.completion_pct - original.today_progress;
          patchData.overall_pct = Math.min(100, Math.max(0, base + editData.today_progress));
        }
      }

      await axios.put(`/activities/update/${editId}/`, patchData);
      toast.success("Entry updated!");
      setEditId(null); setEditData({});
      await Promise.all([fetchActivities(), fetchBpTasks()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Update failed");
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    if (!window.confirm("Ye entry delete karna chahte hain?")) return;
    try {
      await axios.delete(`/activities/delete/${id}/`);
      toast.success("Entry deleted.");
      await Promise.all([fetchActivities(), fetchBpTasks()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Delete failed");
    }
  };

  /* ── Filter & Paginate ── */
  const filtered = activities.filter(r => {
    const q           = search.toLowerCase();
    const matchSearch = !search || r.bp_task_name?.toLowerCase().includes(q) || r.task_description?.toLowerCase().includes(q);
    const matchFrom   = !dateFrom || r.activity_date >= dateFrom;
    const matchTo     = !dateTo   || r.activity_date <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageSlice  = filtered.slice((page - 1) * perPage, page * perPage);

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <>
      <PageMeta title="Employee Daily Activities — ISMO" description="Log daily activities" />
      <PageBreadcrumb pageTitle="Employee Daily Activities" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      {/* ══ FORM ══ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-100">
          Submit Daily Activity
        </h2>

        {/* Row 1 — L1 / L2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>BP Task Level 1</label>
            <select className={inp} value={l1Id} onChange={e => handleL1Change(e.target.value)}>
              <option value="">-- Select Level 1 Task --</option>
              {l1Tasks.map(t => (
                <option key={t.id} value={t.id}>{t.sr_number} · {t.task}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>BP Task Level 2</label>
            <select className={inp} value={l2Id} onChange={e => handleL2Change(e.target.value)} disabled={!l1Id}>
              <option value="">-- Select Level 2 Task --</option>
              {l2Tasks.map(t => (
                <option key={t.id} value={t.id}>{t.sr_number} · {t.task}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2 — L3 / Dates (readonly from BP) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>BP Task Level 3</label>
            <select className={inp} value={l3Id} onChange={e => handleL3Change(e.target.value)} disabled={!l2Id}>
              <option value="">-- Select Level 3 Task --</option>
              {l3Tasks.map(t => (
                <option key={t.id} value={t.id}>{t.sr_number} · {t.task}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Start Date</label>
              <input type="date" className={`${inp} bg-gray-50 cursor-not-allowed`}
                value={selectedTask?.start_date || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>End Date</label>
              <input type="date" className={`${inp} bg-gray-50 cursor-not-allowed`}
                value={selectedTask?.end_date || ""} readOnly />
            </div>
          </div>
        </div>

        {/* Row 3 — Description */}
        <div className="mb-4">
          <label className={lbl}>Task Description <span className="text-red-500">*</span></label>
          <textarea className={inp} rows={3}
            placeholder="Write details of today's activity"
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        {/* Row 4 — Risk */}
        <div className="mb-4">
          <label className={lbl}>Comment / Risk Identified</label>
          <textarea className={inp} rows={2}
            placeholder="Any Risk encounter..."
            value={risk} onChange={e => setRisk(e.target.value)} />
        </div>

        {/* Row 5 — Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={lbl}>
              Overall Completion (%)
              {selectedTask && (
                <span className="ml-1 text-blue-600 font-normal normal-case">
                  — BP: {selectedTask.completion_pct}%
                </span>
              )}
            </label>
            <input type="number" className={`${inp} bg-gray-50 cursor-not-allowed`}
              value={overallPct} readOnly
              placeholder="Auto fill from BP" />
          </div>
          <div>
            <label className={lbl}>
              Today's Progress (%)
              <span className="ml-1 text-gray-400 font-normal normal-case text-xs">
                (jo aaj kiya — BP mein add hoga)
              </span>
            </label>
            <input type="number" className={inp}
              placeholder="e.g. 10" min={0} max={100}
              value={todayProg} onChange={e => setTodayProg(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Activity Date <span className="text-red-500">*</span></label>
            <input type="date" className={inp}
              value={actDate} onChange={e => setActDate(e.target.value)} />
          </div>
        </div>

        {/* Selected Task Info */}
        {selectedTask && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <span className="font-semibold">Selected:</span> {selectedTask.sr_number} · {selectedTask.task}
            <span className="mx-2">|</span>
            <span className="font-semibold">Dept:</span> {selectedTask.department}
            <span className="mx-2">|</span>
            <span className="font-semibold">Current BP Completion:</span> {selectedTask.completion_pct}%
            {todayProg && (
              <>
                <span className="mx-2">|</span>
                <span className="font-semibold text-green-700">
                  After Submit: {Math.min(100, selectedTask.completion_pct + parseInt(todayProg || "0"))}%
                </span>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Day Activity"}
          </button>
        </div>
      </div>

      {/* ══ HISTORY TABLE ══ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-3">My Activity History</h2>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
            <option value={10}>10 entries</option>
            <option value={25}>25 entries</option>
            <option value={50}>50 entries</option>
          </select>
          <div className="flex-1" />
          <input type="text" placeholder="Search..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none w-36" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>From</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>To</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={() => setPage(1)}
            className="px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded-lg">
            Search
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-100 text-blue-900">
                {["Sr.", "Task", "Description", "Comment/Risk", "Start Date", "End Date",
                  "Activity Date", "Today %", "Overall %", "Status", "Edit", "Delete"].map(h => (
                  <th key={h} className="border border-blue-200 px-2 py-2 text-center font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">
                  <div className="inline-block w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                </td></tr>
              ) : pageSlice.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">No activity record found</td></tr>
              ) : pageSlice.map((r, i) => {
                const isEditing = editId === r.id;
                const absIdx    = (page - 1) * perPage + i;
                return (
                  <tr key={r.id} className={`${isEditing ? "bg-yellow-50" : absIdx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>

                    <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-500">{absIdx + 1}</td>

                    {/* Task */}
                    <td className="border border-gray-200 px-2 py-1.5">
                      <div className="font-semibold text-blue-700 text-xs">{r.bp_task_sr}</div>
                      <div className="text-gray-600 text-xs">{r.bp_task_name || "—"}</div>
                    </td>

                    {/* Description */}
                    <td className="border border-gray-200 px-2 py-1.5 text-gray-600 max-w-[160px]">
                      {isEditing ? (
                        <textarea className="w-full border border-blue-400 rounded px-1 py-1 text-xs bg-blue-50 outline-none" rows={2}
                          value={editData.task_description ?? r.task_description}
                          onChange={e => setEditData(d => ({ ...d, task_description: e.target.value }))} />
                      ) : <span className="break-words">{r.task_description || "—"}</span>}
                    </td>

                    {/* Risk */}
                    <td className="border border-gray-200 px-2 py-1.5 text-gray-500 max-w-[120px]">
                      {isEditing ? (
                        <textarea className="w-full border border-blue-400 rounded px-1 py-1 text-xs bg-blue-50 outline-none" rows={2}
                          value={editData.risk_comment ?? r.risk_comment}
                          onChange={e => setEditData(d => ({ ...d, risk_comment: e.target.value }))} />
                      ) : <span className="break-words">{r.risk_comment || "—"}</span>}
                    </td>

                    <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500 whitespace-nowrap">{r.bp_task_start_date || "—"}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500 whitespace-nowrap">{r.bp_task_end_date || "—"}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center whitespace-nowrap">{r.activity_date}</td>

                    {/* Today Progress */}
                    <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-blue-700">
                      {isEditing ? (
                        <input type="number" min={0} max={100}
                          className="w-14 border border-blue-400 rounded px-1 py-1 text-xs bg-blue-50 outline-none text-center"
                          value={editData.today_progress ?? r.today_progress}
                          onChange={e => setEditData(d => ({ ...d, today_progress: parseInt(e.target.value) || 0 }))} />
                      ) : `${r.today_progress}%`}
                    </td>

                    {/* Overall Pct — live from BP tasks */}
                    <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-green-700">
                      {(() => {
                        // Try to get live completion from refreshed bpTasks
                        const live = bpTasks.find(t => t.id === r.bp_task_id);
                        const pct  = live ? live.completion_pct : r.overall_pct;
                        return (
                          <div className="flex items-center gap-1 justify-center">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-10">
                              <div className="h-full bg-green-500 rounded-full"
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status */}
                    <td className="border border-gray-200 px-2 py-1.5 text-center">
                      {isEditing ? (
                        <select className="border border-blue-400 rounded px-1 py-1 text-xs bg-blue-50 outline-none"
                          value={editData.status ?? r.status}
                          onChange={e => setEditData(d => ({ ...d, status: e.target.value as ActivityRow["status"] }))}>
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>Pending</option>
                          <option>Blocked</option>
                        </select>
                      ) : <StatusBadge status={r.status} />}
                    </td>

                    {/* Edit */}
                    <td className="border border-gray-200 px-2 py-1.5 text-center">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={handleSaveEdit}
                            className="w-6 h-6 bg-green-100 text-green-700 hover:bg-green-200 rounded flex items-center justify-center" title="Save">✓</button>
                          <button onClick={() => { setEditId(null); setEditData({}); }}
                            className="w-6 h-6 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded flex items-center justify-center" title="Cancel">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditId(r.id); setEditData({ ...r }); }}
                          className="w-6 h-6 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded flex items-center justify-center" title="Edit">✏️</button>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="border border-gray-200 px-2 py-1.5 text-center">
                      <button onClick={() => handleDelete(r.id)}
                        className="w-6 h-6 bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center justify-center" title="Delete">🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
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
      </div>
    </>
  );
}