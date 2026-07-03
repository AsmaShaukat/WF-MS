import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios"; // Adjust the import path as necessary
import { useState, useEffect } from "react";
import moment from "moment";
import _ from "lodash";
import { toast, ToastContainer } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";

type AttendanceRow = {
    id: string;
    erp_id: string;
    name: string;
    designation: string;
    section: string;
    grade: string;
    checkin_time: string;
    checkout_time: string;
    flag: string;
};

export default function AttendanceOverview() {
  const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

    const fetchAttendanceData = async () => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        try {
            const attendanceId = "section-attendance";
            toast.loading("Loading Attendance Data", {
                toastId: attendanceId,
            });
            const response = await axios.get(`/attendance/overview/${user?.erpid}`);
            // Ensure response.data is an array and format timestamp
            const cleanedData: AttendanceRow[] = response.data.map((row: any) => ({
                id: row.id,
                erp_id: row.erp_id,
                name: row.name,
                designation: row.designation,
                section: row.section,
                grade: row.grade,
                checkin_time: row.checkin_time != null ? row.checkin_time : "-",
                checkout_time: row.checkout_time != null ? row.checkout_time : "-",
                flag: row.flag,
            }));
            toast.dismiss(attendanceId);
            setAttendanceData(cleanedData);
        } catch (error) {
            console.error("Error fetching attendance data:", error);
        }
    };

const columns: ColumnDef<AttendanceRow>[] = [
    {
        accessorKey: "erp_id",
        header: "ERP ID",
    },
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "designation",
        header: "Designation",
    },
    {
        accessorKey: "section",
        header: "Section",
    },
    {
        accessorKey: "grade",
        header: "Grade",
    },
    {
        accessorKey: "checkin_time",
        header: "Check-in Time",
        cell: ({ getValue }) => {
            const value = getValue<string>();
            return <span>{value !== "-" ? moment(value).format("hh:mm A") : "-"}</span>;
        },
    },
    {
        accessorKey: "checkout_time",
        header: "Check-out Time",
        cell: ({ getValue }) => {
            const value = getValue<string>();
            return <span>{value !== "-" ? moment(value).format("hh:mm A") : "-"}</span>;
        },
    },
    {
        accessorKey: "flag",
        header: "Present/Absent",
        cell: ({ getValue }) => {
            const value = getValue<string>();
            const color =
                value?.toLowerCase() === "present"
                    ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                    : "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-500";
            return <span className={color}>{value}</span>;
        },
    },
];

  return (
    <>
      <PageMeta
        title="ISMO - Today's Attendance"
        description="ISMO Admin Dashboard - Today's Attendance"
      />
      <PageBreadcrumb pageTitle="Today's Attendance" />
      <div className="space-y-6">
        <ComponentCard
          title={`Attendance on ${moment().format("DD MMMM YYYY")}`}
        >
          <EnhancedDataTable<AttendanceRow>
            data={attendancedata}
            columns={columns}
          />
        </ComponentCard>
      </div>
      <ToastContainer position="bottom-right" />
    </>
  );
}
