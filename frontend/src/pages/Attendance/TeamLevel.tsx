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
    designation: string;
    grade: string;
    section: string;
    checkout_time: string;
    checkin_time: string;
    timestamp: string;
    status: string;

};

export default function TeamLevel() {
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
          const user = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await axios.post("/attendance/team-level/", {
        fromdate: fromdate,
        todate: todate,
        erp_id: user.erpid,
      });
      // Ensure response.data is an array and format timestamp
      const cleanedData: AttendanceRow[] = response.data.map((item: any) => {
          const picked = {
            erp_id: item.erp_id,
            name: item.name,
            designation: item.designation,
            grade: item.grade,
            section: item.section,
            checkout_time:
              item.checkout_time && item.checkout_time !== "-"
                ? moment(item.checkout_time).format("YYYY-MM-DD HH:mm:ss")
                : "-",
            checkin_time:
              item.checkin_time && item.checkin_time !== "-"
                ? moment(item.checkin_time).format("YYYY-MM-DD HH:mm:ss")
                : "-",
            timestamp:
              item.timestamp !== "-"
                ? moment(item.timestamp).format("DD-MM-YYYY")
                : "-",
            status: item.checkin_time !== "-" ? item.late : "-",
            late: item.lateintime,
          };
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
        accessorKey: "designation",
        header: "Designation",
    },
    {
        accessorKey: "grade",
        header: "Grade",
    },
    {
        accessorKey: "section",
        header: "Section",
    },
    {
        accessorKey: "timestamp",
        header: "Date",
    },
    {
        accessorKey: "checkin_time",
        header: "Checkin Time",
    },
    {
        accessorKey: "checkout_time",
        header: "Checkout Time",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
            const value = getValue<string>();
            const color =
                value?.toLowerCase() === "absent"
                    ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
                    : value?.toLowerCase() === "present"
                    ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                    : "-";
            return <span className={color}>{value}</span>;
        }
    },
    {
        accessorKey: "late",
        header: "Late In Time",
        cell: ({ getValue }) => {
            const value = getValue<string>();
            
           const color =
             value?.toLowerCase() === "late"
               ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
               : value?.toLowerCase() === "on time"
               ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
               : "-";
                        return <span className={color}>{value}</span>;
        }
    }
];

  return (
    <>
      <PageMeta
        title="ISMO - Team Level Attendance Report"
        description="ISMO Admin Dashboard - Team Level Attendance Report"
      />
      <PageBreadcrumb pageTitle="Team Level Attendance Report" />
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
