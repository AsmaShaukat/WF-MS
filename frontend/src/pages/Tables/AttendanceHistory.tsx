import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios"; // Adjust the import path as necessary
import { useState, useEffect } from "react";
import moment from "moment";
import _ from "lodash";
import { ToastContainer, toast } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import DatePicker from "../../components/form/date-picker";

type AttendanceRow = {
    erp_id: string;
  name: string;
  status: string;
  timestamp: string;
  grade: string;
  flag: string;
  late: string;
};

export default function DataTable() {
  const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [fromdate, setFromdate] = useState<String>(
    moment().format("YYYY-MM-DD")
  );
  const [todate, setTodate] = useState<String>(moment().format("YYYY-MM-DD"));

  useEffect(() => {
    if (fromdate <= todate) {
        fetchAttendanceData();
    } else {
      toast.error("from date cannot be greater than to date");
    }
  }, [todate, fromdate]);

  const fetchAttendanceData = async () => {
      try {
                toast.loading(
                  `Fetching attendance data from ${fromdate} to ${todate}`,{toastId: "attendance-fetch-success"}
                );

      const response = await axios.post("/attendance/history/", {
        fromdate: fromdate,
        todate: todate,
      });

      // Ensure response.data is an array and format timestamp
      const cleanedData: AttendanceRow[] = response.data.map((item: any) => {
          const picked = _.pick(item, [
            "erp_id",
          "name",
              "section",
              "designation",
              "status",
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
          toast.dismiss("attendance-fetch-success");
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
        title="ISMO - Attendance History"
        description="ISMO Admin Dashboard - Attendance History"
      />
      <PageBreadcrumb pageTitle="Attendance History" />
      <div className="space-y-6">
        <ComponentCard title={`Attendance on ${fromdate}`}>
          <ToastContainer position="bottom-right" />

          <div className="flex justify-between items-center mb-4 gap-1">
            <div className="w-1/2">
              <DatePicker
                id="from-date-picker"
                defaultDate={fromdate.toString()}
                label="from date"
                placeholder="Select a date"
                              onChange={(dates, currentDateString) => {
                    console.log(dates);
                  // Handle your logic
                  setFromdate(currentDateString);
                }}
              />
            </div>
            <div className="w-1/2">
              <DatePicker
                id="to-date-picker"
                defaultDate={todate.toString()}
                label="to date"
                placeholder="Select a date"
                              onChange={(dates, currentDateString) => {
                console.log(dates);
                  // Handle your logic
                  setTodate(currentDateString);
                }}
              />
            </div>
          </div>

          <EnhancedDataTable<AttendanceRow>
            data={attendancedata}
                      columns={columns}
            fromdate={fromdate.toString()}
            todate={todate.toString()}
          />
        </ComponentCard>
      </div>
    </>
  );
}
