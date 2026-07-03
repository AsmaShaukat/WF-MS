import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios"; // Adjust the import path as necessary
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import moment from "moment";
import _ from "lodash";

import { ColumnDef } from "@tanstack/react-table";

type AttendanceRow = {
  erp_id: string;
  name: string;
  status: string;
  timestamp: string;
  checkinout: string;
  flag: string;
  late: string;
};

export default function TodaysAttendance() {
  const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const loadingToastId = "attendance-loading";
      toast.loading(
        <span className="text-sm font-semibold">
          Loading/Fetching attendance data...
        </span>,
        { toastId: loadingToastId }
      );

      const response = await axios.get("/attendance/today");
      // Ensure response.data is an array and format timestamp
      const cleanedData: AttendanceRow[] = response.data.map((item: any) => {
        const picked = _.pick(item, [
          "erp_id",
          "name",
            "status",
            "section",
            "designation",
          "grade",
          "timestamp",
          "flag",
          "late",
        ]);
        if (picked.timestamp && typeof picked.timestamp === "string") {
          picked.timestamp = picked.timestamp.replace("T", " ");
        }
        return picked;
      });
      toast.dismiss(loadingToastId);
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
    accessorKey: "section",
    header: "Section",
  },
  {
    accessorKey: "designation",
    header: "Designation",
  },
  {
    accessorKey: "grade",
    header: "Grade",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
  },
  {
    accessorKey: "flag",
    header: "Present/Absent",
  },
  {
    accessorKey: "late",
    header: "Late/On Time",
    cell: ({ getValue }) => {
      const value = getValue<string>();
      const color =
        value?.toLowerCase() === "late" || value?.toLowerCase() === "early"
          ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
          : value?.toLowerCase() === "on time"
          ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
          : "";
      return <span className={color}>{value}</span>;
    },
    meta: {
      getTdClassName: (value: string) =>
        value?.toLowerCase() === "late"
          ? "bg-gray-50"
          : value?.toLowerCase() === "on time"
          ? "bg-gray-50"
          : "",
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
        <ToastContainer position="bottom-right" />
      </div>
    </>
  );
}
