import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════
TYPES
═══════════════════════════════════════ */
interface BPRow {
  id: number;
  sr_number: string;
  parent_sr: string | null;
  level: number;
  section: number | null;       // FK integer
  section_name: string | null;  // annotated from backend
  task: string;
  start_date: string;
  end_date: string;
  lead_team: string;
  lead_team_name?: string;
  support_team: string;
  dependencies: string;
  deliverables: string;
  completion_pct: number;
}

interface NewRow {
  parentSr: string;
  insertAfterId: number;
  sr_number: string;
  level: number;
  section_id: number | null;
  task: string;
  start_date: string;
  end_date: string;
  lead_team: string;
  support_team: string;
  dependencies: string;
  deliverables: string;
}

/* ═══════════════════════════════════════
CONSTANTS
═══════════════════════════════════════ */
const ADMIN_GRADES = [9, 10, 11];

const indentClass = (level: number) => {
  if (level === 1) return "pl-8";
  if (level === 2) return "pl-16";
  return "";
};

const inp = "w-full border border-blue-400 rounded px-1.5 py-1 text-xs bg-blue-50 outline-none focus:border-blue-600";
const newInp = "w-full border border-green-400 rounded px-1.5 py-1 text-xs bg-green-50 outline-none focus:border-green-600";

/* ═══════════════════════════════════════
EXCEL UPLOAD COMPONENT
═══════════════════════════════════════ */
function ExcelUpload({
  onUploadSuccess,
  erpid,
  gradeId,
  sectionId,
  isSuperuser,
}: {
  onUploadSuccess: () => void;
  erpid: number;
  gradeId: number;
  sectionId: number;
  isSuperuser: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = ADMIN_GRADES.includes(gradeId);

  const handleUpload = async () => {
    if (!file) { toast.error("Select file first!"); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("erpid", String(erpid));
    formData.append("section_id", String(sectionId));           // ✅ apni section bhejo
    formData.append("is_superuser", String(isSuperuser));       // ✅ permission check
    setUploading(true);
    try {
      const res = await axios.post("/businessplan/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data", "X-Grade-Id": String(gradeId) },
      });
      toast.success(`${res.data.rows_created} rows imported successfully!`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Could you want to delete all Business Plan? This is not undo action!")) return;
    setDeleting(true);
    try {
      await axios.delete(`/businessplan/delete-all/?is_superuser=${isSuperuser}`, {
        headers: { "X-Grade-Id": String(gradeId) },
      });
      toast.success("Poora Business Plan delete ho gaya!");
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) return null; // Non-admin ko upload section dikhe hi nahi

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl mb-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <label className="text-sm font-semibold whitespace-nowrap text-gray-600">
          📂 Upload Business Plan (Excel):
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4
file:rounded-lg file:border-0 file:text-sm file:font-semibold
file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {file && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </span>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="px-5 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition
bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload & Import"}
      </button>

      {/* Delete All Button */}
      <button
        onClick={handleDeleteAll}
        disabled={deleting}
        className="px-5 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition
bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "🗑 Delete Business Plan"}
      </button>
    </div>
  );
}
/* ═══════════════════════════════════════
BP TABLE COMPONENT
═══════════════════════════════════════ */
function BPTable({
  data,
  gradeId,
  sectionId,
  isSuperuser,
  onRefresh,
}: {
  data: BPRow[];
  gradeId: number;
  sectionId: number;
  isSuperuser: boolean;
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<BPRow>>({});
  const [newRow, setNewRow] = useState<NewRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Section groups
  const sectionGroups: Record<string, BPRow[]> = {};
  data.forEach((row) => {
    const key = row.section_name || "Unknown Section";
    if (!sectionGroups[key]) sectionGroups[key] = [];
    sectionGroups[key].push(row);
  });

  // Helper: get parent section's lead_team options for a sub-row
  const getParentLeadTeamOptions = (row: BPRow): string[] => {
    // Try parent_sr first, else derive from sr_number (e.g. "T-SO-01-01" -> "T-SO-01")
    let parentSr = row.parent_sr;
    if (!parentSr && row.sr_number) {
      const parts = row.sr_number.split("-");
      if (parts.length > 1) parentSr = parts.slice(0, -1).join("-");
    }
    if (!parentSr) return [];
    const parent = data.find((r) => r.sr_number === parentSr);
    if (!parent) return [];
    const leadVal = parent.lead_team_name || parent.lead_team || "";
    if (!leadVal) return [];
    return [...new Set(
      leadVal.split(/[,\/;&]+/).map((t) => t.trim()).filter(Boolean)
    )];
  };

  // Helper: get lead_team options by parent sr_number string (for new row add)
  const getLeadTeamOptsBySr = (parentSr: string): string[] => {
    if (!parentSr) return [];
    const parent = data.find((r) => r.sr_number === parentSr);
    if (!parent) return [];
    const leadVal = parent.lead_team_name || parent.lead_team || "";
    if (!leadVal) return [];
    return [...new Set(
      leadVal.split(/[,\/;&]+/).map((t) => t.trim()).filter(Boolean)
    )];
  };

  const startEdit = (row: BPRow) => {
    setNewRow(null);
    setEditingId(row.id);
    setEditData({ ...row });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await axios.put(`/businessplan/update/${editingId}/`, editData, {
        headers: { "X-Grade-Id": String(gradeId) },
      });
      toast.success("Row updated!");
      setEditingId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Update failed");
    } finally { setSaving(false); }
  };

  const deleteRow = async (id: number, task: string) => {
    if (!window.confirm(`Delete: "${task}"?`)) return;
    try {
      await axios.delete(`/businessplan/delete/${id}/`, {
        headers: { "X-Grade-Id": String(gradeId) },
        params: {
          section_id: sectionId,
          is_superuser: isSuperuser,
        },
      });
      toast.success("Row deleted.");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Delete failed");
    }
  };

  const openAddRow = (parentRow: BPRow) => {
    setEditingId(null);
    const siblings = data.filter((r) => r.parent_sr === parentRow.sr_number);
    const nextNum = siblings.length + 1;
    const newSr = `${parentRow.sr_number}-${String(nextNum).padStart(2, "0")}`;
    setNewRow({
      parentSr: parentRow.sr_number,
      insertAfterId: parentRow.id,
      sr_number: newSr,
      level: parentRow.level + 1,
      section_id: parentRow.section ?? null,
      task: "",
      start_date: "",
      end_date: "",
      lead_team: "",
      support_team: "",
      dependencies: "",
      deliverables: "",
    });
  };

  const cancelNewRow = () => setNewRow(null);

  const saveNewRow = async () => {
    if (!newRow) return;
    if (!newRow.task.trim()) { toast.error("Task name are required!"); return; }
    setSaving(true);
    try {
      await axios.post(`/businessplan/add/`, {
        sr_number: newRow.sr_number,
        parent_sr: newRow.parentSr,
        level: newRow.level,
        section_id: newRow.section_id ?? sectionId ?? null,
        user_section_id: sectionId,           // ✅ backend permission check ke liye
        is_superuser: isSuperuser,            // ✅ superuser check
        task: newRow.task,
        start_date: newRow.start_date || null,
        end_date: newRow.end_date || null,
        lead_team: newRow.lead_team,
        support_team: newRow.support_team,
        dependencies: newRow.dependencies,
        deliverables: newRow.deliverables,
        completion_pct: 0,
        created_by: 0,
        uploaded_by_grade: gradeId,
      }, { headers: { "X-Grade-Id": String(gradeId) } });
      toast.success(`${newRow.sr_number} added successfully!`);
      setNewRow(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Add failed");
    } finally { setSaving(false); }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No Business Plan data yet.</p>
        <p className="text-sm mt-1">Upload Excel file from above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-blue-100 text-blue-900">
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-[115px]">Sr. No.</th>
            <th className="border border-blue-200 px-3 py-2 text-left font-semibold text-xs">Task</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-24">Start Date</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-24">End Date</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-20">Lead Team</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-24">Support Team</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-24">Dependencies</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-24">Deliverables</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-28">Completion %</th>
            <th className="border border-blue-200 px-3 py-2 text-center font-semibold text-xs w-24">Action</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(sectionGroups).map(([sectionName, rows]) => (
            <>
              {/* Section Group Row */}
              <tr key={`section-${sectionName}`}>
                <td colSpan={10} className="bg-blue-50 text-blue-800 font-bold text-center border border-blue-200 py-2 px-3 text-xs tracking-wide uppercase">
                  {sectionName}
                </td>
              </tr>

              {rows.map((row, idx) => {
                const isEditing = editingId === row.id;
                const isEven = idx % 2 === 0;
                const showNewRowAfter = newRow !== null && newRow.insertAfterId === row.id;

                return (
                  <>
                    {/* Existing Row */}
                    <tr key={row.id} className={`${isEditing ? "bg-yellow-50" : isEven ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>

                      <td className="border border-gray-200 px-2 py-1.5 text-center font-mono text-xs text-blue-700 font-semibold">
                        {row.sr_number}
                      </td>

                      <td className={`border border-gray-200 px-2 py-1.5 font-medium text-xs ${indentClass(row.level)}`}>
                        {isEditing
                          ? <input className={inp} value={editData.task || ""} onChange={(e) => setEditData({ ...editData, task: e.target.value })} />
                          : <span className="break-words">{row.task}</span>}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-500">
                        {isEditing
                          ? <input type="date" className={inp} value={editData.start_date || ""} onChange={(e) => setEditData({ ...editData, start_date: e.target.value })} />
                          : row.start_date || "—"}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-500">
                        {isEditing
                          ? <input type="date" className={inp} value={editData.end_date || ""} onChange={(e) => setEditData({ ...editData, end_date: e.target.value })} />
                          : row.end_date || "—"}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">
                        {isEditing
                          ? (() => {
                              const parentOpts = getParentLeadTeamOptions(row);
                              return parentOpts.length > 0 ? (
                                <select
                                  className={inp}
                                  value={editData.lead_team || ""}
                                  onChange={(e) => setEditData({ ...editData, lead_team: e.target.value })}
                                >
                                  <option value="">— Select Lead —</option>
                                  {parentOpts.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input className={inp} value={editData.lead_team || ""} onChange={(e) => setEditData({ ...editData, lead_team: e.target.value })} />
                              );
                            })()
                          : row.lead_team_name || "—"}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">
                        {isEditing
                          ? <input className={inp} value={editData.support_team || ""} onChange={(e) => setEditData({ ...editData, support_team: e.target.value })} />
                          : row.support_team || "—"}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-400">
                        {isEditing
                          ? <input className={inp} value={editData.dependencies || ""} onChange={(e) => setEditData({ ...editData, dependencies: e.target.value })} />
                          : row.dependencies || "—"}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">
                        {isEditing
                          ? <input className={inp} value={editData.deliverables || ""} onChange={(e) => setEditData({ ...editData, deliverables: e.target.value })} />
                          : <span className="break-words">{row.deliverables || "—"}</span>}
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center">
                        {/* completion_pct is auto-calculated from daily activities — always read-only */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${isEditing ? (editData.completion_pct ?? row.completion_pct) : row.completion_pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                            {isEditing ? (editData.completion_pct ?? row.completion_pct) : row.completion_pct}%
                          </span>
                        </div>
                      </td>

                      <td className="border border-gray-200 px-2 py-1.5 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button onClick={saveEdit} disabled={saving} className="w-6 h-6 bg-green-100 text-green-700 hover:bg-green-200 rounded flex items-center justify-center" title="Save">✓</button>
                            <button onClick={cancelEdit} className="w-6 h-6 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded flex items-center justify-center" title="Cancel">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            {row.level < 2 && (
                              <button onClick={() => openAddRow(row)} className="w-6 h-6 bg-green-100 text-green-700 hover:bg-green-200 rounded flex items-center justify-center text-sm font-bold" title="Add Sub Task">+</button>
                            )}
                            <button onClick={() => startEdit(row)} className="w-6 h-6 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded flex items-center justify-center text-xs" title="Edit">✏️</button>
                            <button onClick={() => deleteRow(row.id, row.task)} className="w-6 h-6 bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center justify-center text-xs" title="Delete">🗑</button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* New Row — inline insert */}
                    {showNewRowAfter && newRow && (
                      <tr key="new-row" className="bg-green-50">
                        <td className="border border-green-300 px-2 py-2 text-center font-mono text-xs text-green-700 font-semibold">{newRow.sr_number}</td>
                        <td className={`border border-green-300 px-2 py-2 ${indentClass(newRow.level)}`}>
                          <input autoFocus className={newInp} placeholder="Write task name..." value={newRow.task} onChange={(e) => setNewRow({ ...newRow, task: e.target.value })} />
                        </td>
                        <td className="border border-green-300 px-2 py-2">
                          <input type="date" className={newInp} value={newRow.start_date} onChange={(e) => setNewRow({ ...newRow, start_date: e.target.value })} />
                        </td>
                        <td className="border border-green-300 px-2 py-2">
                          <input type="date" className={newInp} value={newRow.end_date} onChange={(e) => setNewRow({ ...newRow, end_date: e.target.value })} />
                        </td>
                        <td className="border border-green-300 px-2 py-2">
                          {(() => {
                            const parentOpts = getLeadTeamOptsBySr(newRow.parentSr);
                            return parentOpts.length > 0 ? (
                              <select
                                className={newInp}
                                value={newRow.lead_team}
                                onChange={(e) => setNewRow({ ...newRow, lead_team: e.target.value })}
                              >
                                <option value="">— Select Lead —</option>
                                {parentOpts.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input className={newInp} placeholder="Lead" value={newRow.lead_team} onChange={(e) => setNewRow({ ...newRow, lead_team: e.target.value })} />
                            );
                          })()}
                        </td>
                        <td className="border border-green-300 px-2 py-2">
                          <input className={newInp} placeholder="Support" value={newRow.support_team} onChange={(e) => setNewRow({ ...newRow, support_team: e.target.value })} />
                        </td>
                        <td className="border border-green-300 px-2 py-2">
                          <input className={newInp} placeholder="Dep" value={newRow.dependencies} onChange={(e) => setNewRow({ ...newRow, dependencies: e.target.value })} />
                        </td>
                        <td className="border border-green-300 px-2 py-2">
                          <input className={newInp} placeholder="Deliverable" value={newRow.deliverables} onChange={(e) => setNewRow({ ...newRow, deliverables: e.target.value })} />
                        </td>
                        <td className="border border-green-300 px-2 py-2 text-center">
                          <span className="text-xs text-gray-400 font-medium">0%</span>
                        </td>
                        <td className="border border-green-300 px-2 py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={saveNewRow} disabled={saving} className="w-6 h-6 bg-green-500 text-white hover:bg-green-600 rounded flex items-center justify-center text-xs font-bold" title="Save">✓</button>
                            <button onClick={cancelNewRow} className="w-6 h-6 bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center justify-center text-xs" title="Cancel">✕</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════
MAIN PAGE COMPONENT (default export)
═══════════════════════════════════════ */
export default function BusinessPlanPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const gradeId: number = user?.grade_id ?? 0;
  const erpid: number = user?.erpid ?? 0;
  const sectionId: number = user?.section_id ?? 0;
  const isSuperuser: boolean = user?.is_superuser ?? false;
  const isAdminGrade: boolean = ADMIN_GRADES.includes(gradeId);

  const [data, setData] = useState<BPRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        grade_id: String(gradeId),
        is_superuser: String(isSuperuser),
        section_id: String(sectionId),
      });
      const res = await axios.get(`/businessplan/all/?${params}`);
      setData(res.data);
    } catch {
      toast.error("There is an Error to load Data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const sections = [...new Set(data.map((r) => r.section_name || "Unknown Section"))];

  const filteredData = data.filter((r) => {
    const matchSearch =
      !search ||
      r.task.toLowerCase().includes(search.toLowerCase()) ||
      r.sr_number.toLowerCase().includes(search.toLowerCase());
    const matchSection = !sectionFilter || (r.section_name || "Unknown Section") === sectionFilter;
    return matchSearch && matchSection;
  });

  const exportExcel = () => {
    const wsData = [
      ["ISMO — Business Plan Report"],
      [],
      ["Sr. No.", "Section", "Task", "Start Date", "End Date", "Lead Team", "Support Team", "Dependencies", "Deliverables", "Completion %"],
      ...filteredData.map((r) => [
        r.sr_number, r.section_name || "", r.task,
        r.start_date || "", r.end_date || "",
        r.lead_team_name, r.support_team,
        r.dependencies, r.deliverables,
        `${r.completion_pct}%`,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Business Plan");
    XLSX.writeFile(wb, "business_plan.xlsx");
  };

  return (
    <>
      <PageMeta title="Business Plan — ISMO" description="Business Plan Module" />
      <PageBreadcrumb pageTitle="Business Plan" />
      <ToastContainer position="top-right" autoClose={3000} style={{ marginTop: "70px" }} />

      {/* Excel Upload */}
      <ExcelUpload
        onUploadSuccess={fetchData}
        erpid={erpid}
        gradeId={gradeId}
        sectionId={sectionId}
        isSuperuser={isSuperuser}
      />

      <ComponentCard title="Business Plan">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search task or Sr. No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-52 border border-gray-300 rounded-lg px-3 py-2
text-xs sm:text-sm focus:outline-none focus:border-blue-500
focus:ring-1 focus:ring-blue-100"
          />
          {/* Section filter — sirf admin/superuser ke liye */}
          {(isSuperuser || isAdminGrade) && (
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2
text-xs sm:text-sm focus:outline-none focus:border-blue-500
focus:ring-1 focus:ring-blue-100"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          )}
          <div className="hidden sm:flex flex-1" />
          <button
            onClick={() => {
              const url = `/business-plan/main-task-report?section_id=${sectionId}&is_superuser=${isSuperuser}`;
              window.open(url, "_blank");
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2
px-4 py-2 bg-purple-700 hover:bg-purple-800 active:bg-purple-900
text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            🧾 Main Task Report
          </button>
          <button
            onClick={exportExcel}
            className="w-full sm:w-auto flex items-center justify-center gap-2
px-4 py-2 bg-green-700 hover:bg-green-800 active:bg-green-900
text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            📊 Export Excel
          </button>
        </div>

        {/* Records count */}
        {!loading && (
          <div className="mb-2 text-xs text-gray-400">
            {filteredData.length} records
            {sectionFilter && ` — ${sectionFilter}`}
            {!isSuperuser && !isAdminGrade && sectionId > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                Section Filter Active
              </span>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm font-medium">No Data Found</p>
            <p className="text-xs mt-1">Change search or filter</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-1 sm:hidden">
              ← Scroll to see all columns →
            </p>
            <div className="w-full rounded-lg border border-gray-100 overflow-x-auto xl:overflow-x-visible">
              <BPTable
                data={filteredData}
                gradeId={gradeId}
                sectionId={sectionId}
                isSuperuser={isSuperuser}
                onRefresh={fetchData}
              />
            </div>
          </>
        )}
      </ComponentCard>
    </>
  );
}