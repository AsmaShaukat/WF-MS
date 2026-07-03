import { useState, useEffect } from "react";
import moment from "moment";
import { ToastContainer, toast } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";

import axios from "../../api/axios";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import DatePicker from "../../components/form/date-picker";
import SearchableDropdown from "../../components/form/input/SearchableDropDown";
import TimePicker from "../../components/form/input/TimePicker";
import Button from "../../components/ui/button/Button";

// --- Types ---
type AttendanceFormData = {
  id?:number
  employeeId: number | null;
  date: string;
  checkInTime: string;
  checkOutTime: string;
};

type AttendanceRow = {
    id: number;
    uid?: number;
    user_id: number;
    checkin_time?: string;
    checkout_time?: string;
    punch?: number;
    lateintime?: string;
    status?: string;
    timestamp: string;
};

const INITIAL_FORM: AttendanceFormData = {
  employeeId: null,
  date: moment().format("YYYY-MM-DD"),
  checkInTime: "",
  checkOutTime: "",
};

export default function NccUpdateAttendance() {
  const [formData, setFormData] = useState<AttendanceFormData>(INITIAL_FORM);
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: number; label: string }[]
  >([]);
 const [updateFlag, setUpdateFlag] = useState<boolean>(false);
// Table columns
const columns: ColumnDef<AttendanceRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "user_id", header: "HRIS ID" },
    {
        accessorKey: "checkin_time",
        header: "Check-in Time",
        cell: ({ row }) =>
            row.original.checkin_time
                ? moment(row.original.checkin_time).format("YYYY-MM-DD HH:mm:ss")
                : "-",
    },
    {
        accessorKey: "checkout_time",
        header: "Check-out Time",
        cell: ({ row }) =>
            row.original.checkout_time
                ? moment(row.original.checkout_time).format("YYYY-MM-DD HH:mm:ss")
                : "-",
    },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "punch", header: "Punch" },
    { accessorKey: "lateintime", header: "Late In Time" },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
            <div className="flex gap-2">
                <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleEdit(row.original.id)}
                >
                    Edit
                </Button>
            </div>
        ),
    },
];

// Edit handler
const handleEdit = (id:Number) => {
    const row = attendanceData.find((row) => row.id === id);
    if (row) {
        setFormData({
            id: row.id,
            employeeId: row.user_id,
            date: row.checkin_time ? moment(row.checkin_time).format("YYYY-MM-DD") : moment(row.timestamp).format("YYYY-MM-DD"),
            checkInTime: row.checkin_time ? moment(row.checkin_time).format("HH:mm:ss") : "",
            checkOutTime: row.checkout_time ? moment(row.checkout_time).format("HH:mm:ss") : "",
        });
       setUpdateFlag(true)
    }
};



  // --- Handlers ---
  const handleChange = (
    field: keyof AttendanceFormData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    };

    useEffect(() => {
   

        fetchEmployeeData();
    }, [formData.employeeId, formData.date]);

    
        const fetchEmployeeData = () => {
          if (formData.employeeId && formData.date) {
            axios
              .post("/attendance/current_attendance/", {
                empid: formData.employeeId,
                date: formData.date,
              })
              .then((response) => {
                const data = response.data.attendance;
                setAttendanceData(data);
              })
              .catch((error) => {
                console.error("Error fetching employee data:", error);
              });
          }
        };
  const validate = (): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};
    if (!formData.employeeId) fieldErrors.employeeId = "Employee is required";
    if (!formData.date) fieldErrors.date = "Date is required";
    if (!formData.checkInTime)
      fieldErrors.checkInTime = "Check-in time is required";
    if (!formData.checkOutTime)
      fieldErrors.checkOutTime = "Check-out time is required";
    return fieldErrors;
  };

  const fetchAttendanceData = async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error("all fields are required.");
      return;
    }

    try {
      const payload = {
        employeeId: formData.employeeId,
        date: formData.date,
        checkIn: formData.checkInTime,
        checkOut: formData.checkOutTime,
        };
        if (updateFlag) {
            await axios.post("/attendance/shift_update/", payload);
            toast.success("Attendance updated successfully");
        } else {
            await axios.post("/attendance/shift_add/", payload);
            toast.success("Attendance added successfully");
        }
        fetchEmployeeData();

      setErrors({});
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      toast.error(`Failed to update attendance: ${message}`);
    }
  };

  useEffect(() => {
    // Fetch employees & existing attendance
    const loadData = async () => {
      try {
          const response = await axios.get("users/ncc_employees/");
        //   axios.get("/attendance/history/");

        // Remove duplicates by hris_id, keep only the first occurrence
        const seen = new Set();
        const uniqueEmployees = response.data.matched.filter((emp: any) => {
          if (seen.has(emp.hris_id)) return false;
          seen.add(emp.hris_id);
          return true;
        });
        setEmployeeOptions(
          uniqueEmployees.map((emp: any) => ({
            value: emp.hris_id,
            label: emp.empname,
          }))
        );
      } catch (error) {
        toast.error("Failed to load data");
      }
    };
    loadData();
  }, []);

  // --- UI ---
  return (
    <>
      <PageMeta
        title="ISMO - Attendance History"
        description="ISMO Admin Dashboard - Attendance History"
      />
      <PageBreadcrumb pageTitle="Attendance History" />

      <div className="space-y-6">
        <ComponentCard title="Update Attendance for NCC">
          <ToastContainer position="bottom-right" />

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-4">
            <SearchableDropdown
              options={employeeOptions}
              placeholder="Select a user"
              label="Employees"
              id="employee-dropdown"
              value={
                employeeOptions.find(
                  (opt) => opt.value === formData.employeeId
                )?.value || ""
              }
              onChange={(value) => handleChange("employeeId", value ? Number(value) : null)}
              error={!!errors.employeeId}
              hint={errors.employeeId}
            />

            <DatePicker
              id="date-picker"
              defaultDate={formData.date}
              label="Date"
              placeholder="Select a date"
              onChange={(_, currentDateString) =>
                handleChange("date", currentDateString)
              }


            />

            <TimePicker
              id="checkin-picker"
              defaultDate={formData.checkInTime}
              label="Check-in time"
              placeholder="Select time"
              onChange={(_, currentTimeString) =>
                handleChange("checkInTime", currentTimeString)
              }
   
            />

            <TimePicker
              id="checkout-picker"
              defaultDate={formData.checkOutTime}
              label="Check-out time"
              placeholder="Select time"
              onChange={(_, currentTimeString) =>
                handleChange("checkOutTime", currentTimeString)
              }
            />

      

            <div className="flex justify-center items-center sm:col-span-2">
              <Button
                size="sm"
                className="w-1/3 mt-7"
                variant="primary"
                onClick={fetchAttendanceData}
              >
                {updateFlag ? "Update" : "Add"} Attendance
              </Button>
            </div>
          </div>

          <EnhancedDataTable<AttendanceRow>
            data={attendanceData}
            columns={columns}
           
          />
        </ComponentCard>
      </div>
    </>
  );
}
