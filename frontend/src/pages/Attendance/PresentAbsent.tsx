import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios";
import { useState, useEffect } from "react";
import moment from "moment";
import { ToastContainer } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import DatePicker from "../../components/form/date-picker";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
type AttendanceRow = {
    id: string;
    uid: string;
    erp_id: string;
    name: string;
    designation: string;
    section: string;
    timestamp: string;
    grade: string;
 
    punch?: string;
    flag?: string;
};

export default function SectionAttendanceReport() {
    const [attendancedata, setAttendanceData] = useState<AttendanceRow[]>([]);
    
    const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
    const [status] = useState<{ value: string; label: string }[]>([
        { value: "present", label: "Present" },
        { value: "absent", label: "Absent" },
    ]);

    const [data, setData] = useState<{ date: string; status: string; section: string }>({
        date: moment().format("YYYY-MM-DD"),
        status: "present",
        section: "",
    });
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

   
    const handleSearch = () => {
        fetchAttendanceData();
    }

const capitalizeFirstLetter = (val:string) => {
  if (!val) return "";
  return val.charAt(0).toUpperCase() + val.slice(1);
}

    const fetchAttendanceData = async () => {
        try {
            const response = await axios.post("/attendance/status/", data);
            const cleanedData: AttendanceRow[] = response.data.map((item: any) => ({
                erp_id: item.erp_id,
                name: item.name,
                designation: item.designation,
                grade: item.grade,
                section: item.section,
                timestamp: data.status === 'present'
                    ? moment(item.timestamp).format("YYYY-MM-DD HH:mm:ss")
                    : data.date,
      
           
                punch: item.uid,
                flag: capitalizeFirstLetter(data.status),
            }));
            setAttendanceData(cleanedData);
        } catch (error) {
            console.error("Error fetching attendance data:", error);
        }
    };

    const columns: ColumnDef<AttendanceRow>[] = [
        { accessorKey: "erp_id", header: "ERP ID" },
        { accessorKey: "name", header: "Name" },
        { accessorKey: "designation", header: "Designation" },
        { accessorKey: "section", header: "Section" },
        { accessorKey: "grade", header: "Grade" },
        { accessorKey: "timestamp", header: "Timestamp" },
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
              <div className="w-1/3">
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
              <div className="w-1/3">
                <Label>Select Section</Label>
                <Select
                  options={options}
                  placeholder="Select a section"
                  onChange={(value) => {
                    setData((prev) => ({ ...prev, section: value }));
                  }}
                  className="dark:bg-dark-900"
                />
              </div>
              <div className="w-1/3">
                <Label>Select Status</Label>
                <Select
                  options={status}
                  placeholder="Select a status"
                  onChange={(value) => {
                    setData((prev) => ({ ...prev, status: value }));
                  }}
                  className="dark:bg-dark-900"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button size="lg" variant="primary" onClick={handleSearch}>
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
