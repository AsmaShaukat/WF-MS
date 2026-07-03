import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios";
import { useState, useEffect } from "react";
import moment from "moment";
import { toast, ToastContainer } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import DatePicker from "../../components/form/date-picker";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import _ from 'lodash'
type AttendanceRow = {
    id?: string;
    uid?: string;
    erp_id: string | number;
    name: string;
    designation: string;
    section: string;
    timestamp: string;
    grade?: string;
    punch?: string;
    checkin_time?: string;
    checkout_time?: string;
    flag?: string;
    shifttype?: string;
    lateintime?: string;
    shift_id?: string;
    shiftname?: string;
    status?: string;
};



export default function ShiftAttendance() {
  const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);

  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    []
  );


  const [data, setData] = useState<{
    date: string;
    shift: string;
  }>({
    date: moment().format("YYYY-MM-DD"),
    shift: "morning",
  });
  useEffect(() => {
    getSectionsData();
  }, []);

  const getSectionsData = async () => {
      const response = await axios.get(`attendance/get-shifts`);
    setOptions(
      response.data.map((section: any) => ({
        value: section.shift_id,
        label: section.name,
      }))
    );
  };

  

    const getShiftDetails = async () => {
        try {
            toast.loading(
            `Fetching attendance data for shift on ${data.date}`, { toastId: "attendance-fetch-success" }
            );
            const response = await axios.post(`/attendance/shift-details/`, { shiftid: data.shift, date: data.date });
            const nccData = _.filter(response.data.attendance, (item) => item.shifttype === 'NCC');
            const cleanedData: AttendanceRow[] = nccData.map(
            (item: any) => ({
                erp_id: item.erp_id,
                name: item.name,
                designation: item.designation,
                section: item.section,
                timestamp: item.timestamp
                ? moment(item.timestamp).format("YYYY-MM-DD HH:mm:ss")
                : "-",
                checkin_time: item.checkin_time
                ? moment(item.checkin_time).format("YYYY-MM-DD HH:mm:ss")
                : "-",
                checkout_time: item.checkout_time
                ? moment(item.checkout_time).format("YYYY-MM-DD HH:mm:ss")
                : "-",
                flag: item.flag,
                shift_id: item.shift_id,
                shiftname: item.shiftname,
                shifttype: item.shifttype,
                status: item.status,
                lateintime: item.lateintime,
            })
            );
            toast.dismiss("attendance-fetch-success");
            setAttendanceData(cleanedData);
        } catch (error: any) {
            toast.dismiss("attendance-fetch-success");
            setAttendanceData([]); // Blank the grid on error
            toast.error("Shift is on off day");
        }
    };

 
const columns: ColumnDef<AttendanceRow>[] = [
  { accessorKey: "erp_id", header: "ERP ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "designation", header: "Designation" },
  { accessorKey: "section", header: "Section" },

  { accessorKey: "checkin_time", header: "Check-in Time" },
  { accessorKey: "checkout_time", header: "Check-out Time" },
  {
    accessorKey: "flag",
    header: "Present/Absent",
    cell: ({ getValue }) => {
      const value = getValue<string>();
      const color =
        value?.toLowerCase() === "absent"
          ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
          : value?.toLowerCase() === "present"
          ? "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
          : "";
      return <span className={color}>{value}</span>;
    },
  },

  { accessorKey: "shiftname", header: "Shift Name" },
  { accessorKey: "shifttype", header: "Shift Type" },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "lateintime",
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
        <ComponentCard title={`Attendance on ${data.date}`}>
          <ToastContainer position="bottom-right" />
          <div className="flex justify-between items-center mb-4 gap-1">
            <div className="w-1/2">
              <DatePicker
                id="from-date-picker"
                defaultDate={data.date}
                label="Date"
                placeholder="Select a date"
                onChange={(_, currentDateString) => {
                  setData((prev) => ({ ...prev, date: currentDateString }));
                }}
              />
            </div>
            <div className="w-1/2">
              <Label>Select Shift</Label>
              <Select
                options={options}
                placeholder="Select a shift"
                onChange={(value) => {
                  setData((prev) => ({ ...prev, shift: value }));
                }}
                className="dark:bg-dark-900"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="primary" onClick={getShiftDetails}>
              Search
            </Button>
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
