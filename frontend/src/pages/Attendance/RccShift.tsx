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
import _ from "lodash";
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
  lateintime?: string;
  shift_id?: string;
  shiftname?: string;
  shifttype?: string;
  status?: string;
};

export default function RccShift() {
  const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);

  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    []
  );

  const [data, setData] = useState<{
    fromdate: string;
    todate: string;
    shift: string;
  }>({
    fromdate: moment().format("YYYY-MM-DD"),
    todate: moment().format("YYYY-MM-DD"),
    shift: "",
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
      if (data.fromdate > data.todate) {
        toast.error("From date cannot be greater than To date");
      }
      if (!data.shift) {
        toast.error("Please select a shift");
        return;
      }
      toast.loading(
        `Fetching attendance data for shift from ${data.fromdate} to ${data.todate}`,
        { toastId: "attendance-fetch-success" }
      );
      const response = await axios.post(`/attendance/shift-history/`, {
        shiftid: data.shift,
        fromdate: data.fromdate,
        todate: data.todate,
      });
      const nccdata = _.filter(
        response.data.attendance,
        (item: any) => item.shifttype === "RCC"
      );
      const cleanedData: AttendanceRow[] = nccdata.map((item: any) => ({
        erp_id: item.erp_id,
        name: item.name,
        designation: item.designation,
        shifttype: item.shifttype,
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
        // status: item.status,
        lateintime: item.lateintime,
      }));
      toast.dismiss("attendance-fetch-success");
      setAttendanceData(cleanedData);
      // Handle the response and update state as needed
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while fetching shift details."
      );
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

    {
      accessorKey: "lateintime",
      header: "Late/On Time",
      cell: ({ getValue }) => {
        const value = getValue<string>()?.toLowerCase();
        let color = "";
        let label = getValue<string>();

        // Handle multiple possible values for "on time-in", "early out", etc.
        if (
          value === "on time-in" ||
          value === "on time-in, early out" ||
          value === "on time-in, on time-out"
        ) {
          color =
            "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
        } else if (
          value === "late" ||
          value === "early" ||
          value === "early out"
        ) {
          color =
            "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500";
        }

        return <span className={color}>{label}</span>;
      },
    },
  ];

  return (
    <>
      <PageMeta
        title="ISMO - Shift Attendance History"
        description="ISMO Admin Dashboard - Shift Attendance History"
      />
      <PageBreadcrumb pageTitle="Shift Attendance History" />
      <div className="space-y-6">
        <ComponentCard
          title={`Attendance from ${data.fromdate} to ${data.todate}`}
        >
          <ToastContainer position="bottom-right" />
          <div className="flex justify-between items-center mb-4 gap-1">
            <div className="w-1/3">
              <DatePicker
                id="from-date-picker"
                defaultDate={data.fromdate}
                label="From Date"
                placeholder="Select a date"
                onChange={(_, currentDateString) => {
                  setData((prev) => ({ ...prev, fromdate: currentDateString }));
                }}
              />
            </div>
            <div className="w-1/3">
              <DatePicker
                id="to-date-picker"
                defaultDate={data.todate}
                label="To Date"
                placeholder="Select a date"
                onChange={(_, currentDateString) => {
                  setData((prev) => ({ ...prev, todate: currentDateString }));
                }}
              />
            </div>
            <div className="w-1/3">
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
