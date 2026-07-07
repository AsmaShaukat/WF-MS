import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  lead_team_id: number | null;
  lead_team_name?: string;
  support_team: string;
  dependencies: string;
  deliverables: string;
  completion_pct: number;
  created_by: number;
}

interface SubSectionOption {
  id: number;
  sub_section_name: string;
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
  lead_team_id: string; // select value ke liye string, submit se pehle number banega
  support_team: string;
  dependencies: string;
  deliverables: string;
}

/* ═══════════════════════════════════════
CONSTANTS
═══════════════════════════════════════ */
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
function BusinessPlanTemplateGuide({ isAdminAccess }: { isAdminAccess: boolean }) {
  const [open, setOpen] = useState(false);

  if (!isAdminAccess) return null; // Sirf grade-9 head / grade 10,11 / superuser ko dikhta hai

  const downloadTemplate = () => {
    const headers = [
      "sr_number", "section_id", "task", "start_date", "end_date",
      "lead_team", "support_team", "dependencies", "deliverables",
      "level", "parent_sr",
    ];
    const exampleRows = [
      ["T-IT-01", 7, "Upgrade network infrastructure", "2026-01-01", "2026-06-30", "DPC", "Vendor A, Vendor B", "Budget approval", "New switches installed", 0, ""],
      ["T-IT-01-01", 7, "Procure new switches", "2026-01-01", "2026-02-15", "DPC", "Procurement team", "Budget approval", "Purchase order signed", 1, "T-IT-01"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Business Plan Template");
    XLSX.writeFile(wb, "Business_Plan_Template.xlsx");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2
px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900
text-white text-xs sm:text-sm font-semibold rounded-lg transition"
      >
        📋 Business Plan Template
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 p-4 pt-24 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">How to create your Business Plan Excel file</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 space-y-4 overflow-y-auto">
              <p>
                Use the template below to prepare your Business Plan. Fill one row per task.
                The first row (header) must stay exactly as it is — do not rename, remove, or reorder the columns.
              </p>

              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Column guide:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>sr_number</b> — A unique code for this task, e.g. <code>T-IT-01</code> for a main task, and <code>T-IT-01-01</code> for its first sub-task. This must be unique — do not reuse a number that already exists.</li>
                  <li><b>section_id</b> — The numeric ID of your section. Leave it as your own section's ID unless you manage more than one section.</li>
                  <li><b>task</b> — A short, clear description of the task.</li>
                  <li><b>start_date</b> and <b>end_date</b> — Use the format <code>YYYY-MM-DD</code> (e.g. 2026-01-31). A sub-task's dates must fall within its parent task's date range.</li>
                  <li><b>lead_team</b> — <b>Required.</b> The name of the sub-section responsible for this task (e.g. "DPC"). You may also use the sub-section's numeric ID instead of its name. A row without a valid Lead Team will be rejected.</li>
                  <li><b>support_team</b>, <b>dependencies</b>, <b>deliverables</b> — Free text, optional.</li>
                  <li><b>level</b> — <code>0</code> for a main task, <code>1</code> for a sub-task, <code>2</code> for a sub-sub-task.</li>
                  <li><b>parent_sr</b> — The sr_number of the parent task. Leave this empty for a main task (level 0).</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">A few important rules:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Every sr_number must be unique within your section and sub-section.</li>
                  <li>A sub-task's start and end dates must be inside its parent task's date range — not before the parent starts, and not after the parent ends.</li>
                  <li>If a row's sr_number already exists in the system, that row will be skipped when you upload (it will not overwrite existing data).</li>
                  <li>If you are a sub-section head, you can only upload tasks for the sub-section(s) you head — rows for other sub-sections will be skipped.</li>
                  <li>Every row must have a valid Lead Team — rows with a missing or unrecognised Lead Team will not be imported.</li>
                </ul>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Once your file is ready, close this window and use the "Upload Excel" option to import it.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 text-sm rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                ⬇ Download Excel Template
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ExcelUpload({
  onUploadSuccess,
  erpid,
  gradeId,
  sectionId,
  isSuperuser,
  isAdminAccess,
}: {
  onUploadSuccess: () => void;
  erpid: number;
  gradeId: number;
  sectionId: number;
  isSuperuser: boolean;
  isAdminAccess: boolean; // superuser / grade 10,11 / grade-9 sub-section-head (server-verified)
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        headers: { "Content-Type": "multipart/form-data", "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) },
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
      await axios.delete(`/businessplan/delete-all/?is_superuser=${isSuperuser}&section_id=${sectionId}`, {
        headers: { "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) },
      });
      toast.success("The entire Business Plan has been deleted!");
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdminAccess) return null; // Non-admin (grade 1-9 non-head) ko upload section dikhe hi nahi

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
  erpid,
  sectionId,
  isSuperuser,
  isAdminAccess,
  scopeType,
  subSectionOptions,
  ownSubSection,
  onRefresh,
}: {
  data: BPRow[];
  gradeId: number;
  erpid: number;
  sectionId: number;
  isSuperuser: boolean;
  isAdminAccess: boolean; // superuser / grade 10,11 / grade-9 sub-section-head (server-verified)
  scopeType: string; // 'all' | 'section' | 'subsections' | 'own' | 'none'
  subSectionOptions: SubSectionOption[]; // head/admin ke liye lead-team dropdown options (ID-based)
  ownSubSection: SubSectionOption | null; // regular employee ki apni sub-section (read-only)
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<BPRow>>({});
  const [newRow, setNewRow] = useState<NewRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Grade 1-9 (non-head) sirf apni khud ki banayi hui row edit/delete kar sakte hain.
  // Admin-tier (superuser / grade 10,11 / grade-9 head) ko full access hai.
  const canModify = (row: BPRow) => isAdminAccess || row.created_by === erpid;

  // Section groups
  const sectionGroups: Record<string, BPRow[]> = {};
  data.forEach((row) => {
    const key = row.section_name || "Unknown Section";
    if (!sectionGroups[key]) sectionGroups[key] = [];
    sectionGroups[key].push(row);
  });

  const startEdit = (row: BPRow) => {
    setNewRow(null);
    setEditingId(row.id);
    setEditData({ ...row });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async () => {
    if (!editingId) return;

    if (scopeType !== "own" && !editData.lead_team_id) {
      toast.error("Lead Team is required — this field cannot be left empty");
      return;
    }

    // Sub-task ki dates apne parent task ke date-range ke andar honi chahiye
    const currentRow = data.find((r) => r.id === editingId);
    const parentSr = currentRow?.parent_sr;
    const parent = parentSr ? data.find((r) => r.sr_number === parentSr) : null;
    const newStart = editData.start_date;
    const newEnd = editData.end_date;
    if (parent && newStart && parent.start_date && newStart < parent.start_date) {
      toast.error(`Start date cannot be earlier than the parent task's start date (${parent.start_date})`);
      return;
    }
    if (parent && newEnd && parent.end_date && newEnd > parent.end_date) {
      toast.error(`End date cannot be later than the parent task's end date (${parent.end_date})`);
      return;
    }
    if (newStart && newEnd && newStart > newEnd) {
      toast.error("End date cannot be later than the parent task'sStart date must be earlier than the end date end date (${parent.end_date})");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/businessplan/update/${editingId}/`, editData, {
        headers: { "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) },
        params: { section_id: sectionId, is_superuser: isSuperuser },
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
        headers: { "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) },
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
      lead_team_id: scopeType === "own" && ownSubSection ? String(ownSubSection.id) : "",
      support_team: "",
      dependencies: "",
      deliverables: "",
    });
  };

  const cancelNewRow = () => setNewRow(null);

  const saveNewRow = async () => {
    if (!newRow) return;
    if (!newRow.task.trim()) { toast.error("Task name are required!"); return; }
    if (scopeType !== "own" && !newRow.lead_team_id) {
      toast.error("Lead Team is required — this field cannot be left empty");
      return;
    }

    // Sub-task ki dates parent task ke date-range ke andar honi chahiye
    const parent = data.find((r) => r.sr_number === newRow.parentSr);
    if (parent && newRow.start_date && parent.start_date && newRow.start_date < parent.start_date) {
      toast.error(`Start date parent task (${parent.start_date}) se pehle nahi ho sakti`);
      return;
    }
    if (parent && newRow.end_date && parent.end_date && newRow.end_date > parent.end_date) {
      toast.error(`End date parent task (${parent.end_date}) ke baad nahi ho sakti`);
      return;
    }
    if (newRow.start_date && newRow.end_date && newRow.start_date > newRow.end_date) {
      toast.error("Start date must be earlier than the end date");
      return;
    }

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
        lead_team_id: newRow.lead_team_id || null,
        support_team: newRow.support_team,
        dependencies: newRow.dependencies,
        deliverables: newRow.deliverables,
        completion_pct: 0,
        created_by: erpid,
        uploaded_by_grade: gradeId,
      }, { headers: { "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) } });
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
                          ? scopeType === "own"
                            ? <span className="text-gray-500">{ownSubSection?.sub_section_name || "—"}</span>
                            : (
                              <select
                                className={inp}
                                value={editData.lead_team_id ?? ""}
                                onChange={(e) => setEditData({ ...editData, lead_team_id: e.target.value ? Number(e.target.value) : null })}
                              >
                                <option value="">— Select Lead —</option>
                                {subSectionOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>{opt.sub_section_name}</option>
                                ))}
                              </select>
                            )
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
                            {canModify(row) && (
                              <>
                                <button onClick={() => startEdit(row)} className="w-6 h-6 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded flex items-center justify-center text-xs" title="Edit">✏️</button>
                                <button onClick={() => deleteRow(row.id, row.task)} className="w-6 h-6 bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center justify-center text-xs" title="Delete">🗑</button>
                              </>
                            )}
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
                          {scopeType === "own"
                            ? <span className="text-xs text-gray-500 px-1">{ownSubSection?.sub_section_name || "—"}</span>
                            : (
                              <select
                                className={newInp}
                                value={newRow.lead_team_id}
                                onChange={(e) => setNewRow({ ...newRow, lead_team_id: e.target.value })}
                              >
                                <option value="">— Select Lead —</option>
                                {subSectionOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>{opt.sub_section_name}</option>
                                ))}
                              </select>
                            )}
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

  const [data, setData] = useState<BPRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subSectionFilter, setSubSectionFilter] = useState(""); // sub_section id (string)

  // Access-scope — ek hi call mein: scope type, apna section ka naam,
  // aur lead-team dropdown options (ya apni khud ki sub-section, agar
  // regular employee ho). Backend har asal data-request pe isko dobara
  // DB se verify karta hai — ye sirf UI dikhane ke liye hai.
  const [scopeType, setScopeType] = useState<string>("none"); // 'all' | 'section' | 'subsections' | 'own' | 'none'
  const [scopeSectionName, setScopeSectionName] = useState<string | null>(null);
  const [subSectionOptions, setSubSectionOptions] = useState<SubSectionOption[]>([]);
  const [ownSubSection, setOwnSubSection] = useState<SubSectionOption | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          section_id: String(sectionId),
          is_superuser: String(isSuperuser),
        });
        const res = await axios.get(`/businessplan/my-scope/?${params}`, {
          headers: { "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) },
        });
        setScopeType(res.data.scope_type);
        setScopeSectionName(res.data.section_name ?? null);
        setSubSectionOptions(res.data.sub_sections ?? []);
        setOwnSubSection(res.data.own_sub_section ?? null);
      } catch {
        setScopeType("none"); // fail-safe: uncertain hone par kuch bhi na dikhao
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full access: superuser / grade 10,11 / grade-9 sub-section-head.
  const isAdminAccess = scopeType === "all" || scopeType === "section" || scopeType === "subsections";

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        grade_id: String(gradeId),
        is_superuser: String(isSuperuser),
        section_id: String(sectionId),
        sub_section_id: subSectionFilter || "0",
      });
      const res = await axios.get(`/businessplan/all/?${params}`, {
        headers: { "X-Grade-Id": String(gradeId), "X-Erp-Id": String(erpid) },
      });
      setData(res.data);
    } catch {
      toast.error("There is an Error to load Data.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [subSectionFilter]);

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

      {/* Business Plan Template — instructions + downloadable Excel template */}
      <div className="mb-3">
        <BusinessPlanTemplateGuide isAdminAccess={isAdminAccess} />
      </div>

      {/* Excel Upload */}
      <ExcelUpload
        onUploadSuccess={fetchData}
        erpid={erpid}
        gradeId={gradeId}
        sectionId={sectionId}
        isSuperuser={isSuperuser}
        isAdminAccess={isAdminAccess}
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
          {/* Section filter — sirf admin-tier (superuser/grade 10,11/grade-9 head) ke liye */}
          {isAdminAccess && (
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
          {/* Sub-Section filter — grade-9 head ko sirf apni headed sub-section(s),
              grade 10/11 ko apni section ki tamam sub-sections dikhti hain */}
          {isAdminAccess && subSectionOptions.length > 0 && (
          <select
            value={subSectionFilter}
            onChange={(e) => setSubSectionFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2
text-xs sm:text-sm focus:outline-none focus:border-blue-500
focus:ring-1 focus:ring-blue-100"
          >
            <option value="">All Sub-Sections</option>
            {subSectionOptions.map((ss) => (
              <option key={ss.id} value={ss.id}>{ss.sub_section_name}</option>
            ))}
          </select>
          )}
          {/* Regular employee (grade 1-9, non-head) — apna section + sub-section read-only dikhta hai */}
          {scopeType === "own" && (
            <span className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-600">
              📍 {scopeSectionName || "—"} <span className="mx-1 text-gray-300">/</span> {ownSubSection?.sub_section_name || "—"}
            </span>
          )}
          <div className="hidden sm:flex flex-1" />
          {/* Main Task Report — sirf grade-9 section-head, grade 10/11 ya superuser ko dikhta hai */}
          {isAdminAccess && (
          <button
            onClick={() => {
              const url = `/business-plan/main-task-report?section_id=${sectionId}&is_superuser=${isSuperuser}&grade_id=${gradeId}&erp_id=${erpid}`;
              window.open(url, "_blank");
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2
px-4 py-2 bg-purple-700 hover:bg-purple-800 active:bg-purple-900
text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            🧾 Main Task Report
          </button>
          )}
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
            {scopeType === "own" && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                Sub-Section Filter Active
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
                erpid={erpid}
                sectionId={sectionId}
                isSuperuser={isSuperuser}
                isAdminAccess={isAdminAccess}
                scopeType={scopeType}
                subSectionOptions={subSectionOptions}
                ownSubSection={ownSubSection}
                onRefresh={fetchData}
              />
            </div>
          </>
        )}
      </ComponentCard>
    </>
  );
}