import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios"; // Adjust the import path as necessary
import { useState, useEffect } from "react";
import moment from "moment";
import _ from "lodash";
import { ToastContainer } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import DatePicker from "../../components/form/date-picker";
import Label from "../../components/form/Label";

import Select from "../../components/form/Select";

type AttendanceRow = {
    erp_id: string;
    name: string;
    designation: string;
    section: string;
    timestamp: string;
    late: string;
    status: string;
    punch: string;
    grade: string;
};

export default function SectionAttendanceReport() {
  const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [section, setSection] = useState<String>("");
  const [date, setDate] = useState<String>(moment().format("YYYY-MM-DD"));

  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    []
  );

  const handleSelectChange = (value: string) => {
    setSection(value);
  
  };

  useEffect(() => {
    getSectionsData();
  }, []);

  const getSectionsData = async () => {
    const response = await axios.get("/sections/get");
    setOptions(
      response.data.map((section: any) => ({
        value: section.id,
        label: section.name,
      }))
    );
  };

  useEffect(() => {
      if (section) {
        fetchAttendanceData();}
  }, [date, section]);

const fetchAttendanceData = async () => {
    try {
   
        const response = await axios.post("/attendance/sections/", {
            date: date,
            section: section,
        });
      
        // Ensure response.data is an array and format timestamp
        const cleanedData: AttendanceRow[] = response.data.map((item: any) => {
            return {
              erp_id: item.erp_id,
              name: item.name,
                designation: item.designation,
                grade: item.grade,
              section: item.section,
              timestamp: item.timestamp!='-'?moment(item.timestamp).format("YYYY-MM-DD HH:mm:ss"): "-",
              late: item.late,
              status: item.status,

              punch: item.punch,
              flag: item.flag, // If flag is still needed
            };
        });
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
  {
    accessorKey: "status",
    header: "Status",
  }
];

  return (
    <>
      <PageMeta
        title="ISMO - Section Attendance Report"
        description="ISMO Admin Dashboard - Section Attendance Report"
      />
      <PageBreadcrumb pageTitle="Section Attendance Report" />
      <div className="space-y-6">
        <ComponentCard title={`Attendance on ${date}`}>
          <ToastContainer position="bottom-right" />

          <div className="flex justify-between items-center mb-4 gap-1">
            <div className="w-1/2">
              <DatePicker
                id="from-date-picker"
                defaultDate={date.toString()}
                label="Date"
                placeholder="Select a date"
                              onChange={(dates, currentDateString) => {
                    console.log(dates);
                  // Handle your logic
                  setDate(currentDateString);
                }}
              />
            </div>
            <div className="w-1/2">
              <Label>Select Section</Label>
              <Select
                options={options}
                placeholder="Select an option"
                onChange={handleSelectChange}
                className="dark:bg-dark-900"
              />
            </div>
          </div>

          <EnhancedDataTable<AttendanceRow>
            data={attendancedata}
            columns={columns}
          />
        </ComponentCard>
      </div>
    </>
  );
}
