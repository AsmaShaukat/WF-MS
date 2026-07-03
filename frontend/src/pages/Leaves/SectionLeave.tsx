import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios";
import { useState, useEffect } from "react";
import _ from "lodash";
import { ToastContainer, toast } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import moment from "moment";
import DatePicker from "../../components/form/date-picker";

type AttendanceRow = {
    id?: number;
 
    section: string;
    erp_id: any;
    leave_type?: string;
    leave_count?: number;
    start_date?: string;
    end_date?: string;
};

export default function SectionLeaveReport() {
  const [SectionLeaveReport, setSectionLeaveReport] = useState<
    AttendanceRow[]
        >([]);
    
  const leavetype = [
    "Sick Leave",
    "Casual Leave",
    "Annual Leave",
    "Maternity Leave",
    "External Meeting",
    "Official Work",
    "Umrah Leave",
    "Hajj Leave",
    "Shift Leave",
    "Rest & Recreational Leave",
    "Compensatory Leave",
    "Short Leave",
    "Study Leave",
    "Marriage Leave",
    "Paternity Leave",
    "Earned Leave",
  ];

  const [sectionOptions, setSectionOptions] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {

    getSectionsData();
  }, []);

  const handleSelectChange = (value: string) => {
    setData({
      ...data,
      section: value,
    });
  };
  const handleSubmit = async () => {
    if (!data.section || !data.leave_type) {
      toast.error("Please select a section and leave type");
      return;
    }
    try {
      const response = await axios.post("/leaves/section-leave-report/", data);
      setSectionLeaveReport(response.data.attendance);
      toast.success("Leave applied successfully");
    } catch (error) {
      console.error("Error applying leave:", error);
      toast.error("Failed to apply leave");
    }
  };

  const getSectionsData = async () => {
    try {
      const response = await axios.get("/sections/get");
      setSectionOptions(
        response.data.map((section: any) => ({
          value: section.id,
          label: section.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Failed to load sections");
    }
  };

  const [data, setData] = useState<{
    section: string;
    leave_type: string;
    start_date: string;
    end_date: string;
  }>({
   
    section: "",
    leave_type: "",
    start_date: moment().format("YYYY-MM-DD").toString(),
    end_date: moment().format("YYYY-MM-DD").toString(),
  });

const columns: ColumnDef<AttendanceRow>[] = [
    {
        header: "ERP ID",
        accessorKey: "erp_id",
    },
    {
        header: "Name",
        accessorKey: "employee_name",
    },
    {
        header: "Section",
        accessorKey: "section",
    },
    {
        header:"Start Date",
        accessorKey:"start_date",
    },
    {
        header:"End Date",
        accessorKey:"end_date",
    },
    {
        header: "Leave Type",
        accessorKey: "leave_type",
    },
    {
        header: "Leave Count",
        accessorKey: "leave_count",
        cell: ({ getValue }) => {
            const value = getValue<number>();
            const color =
                "inline-flex items-center px-6 py-0.5 justify-center gap-1 rounded-full font-semibold text-theme-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
            return <span className={color}>{value ?? 0}</span>;
        },
    },
    
];


  return (
    <>
      <PageMeta
        title="ISMO - Section Leave Report"
        description="ISMO Admin Dashboard - Section Leave Report"
      />
      <PageBreadcrumb pageTitle="Section Leave Report" />
      <div className="space-y-6">
        <ComponentCard title={`Section Leave Report`}>
          <ToastContainer position="bottom-right" />

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-1 justify-center items-center">
       
       

            {/* Section Dropdown */}
            <div className="w-full">
              <Label>Select Section</Label>
              <Select
                options={sectionOptions}
                placeholder="Select an option"
                onChange={handleSelectChange}
                className="dark:bg-dark-900"
              />
            </div>

            {/* Leave Type */}
            <div className="w-full">
              <Label>Leave Type</Label>
              <Select
                options={leavetype.map((type) => ({
                  label: type,
                  value: type,
                }))}
                placeholder="Select an option"
                onChange={(value) =>
                  setData({
                    ...data,
                    leave_type: value,
                  })
                }
                className="dark:bg-dark-900"
              />
                      </div>
                      
                    <div className="w-full my-3">
                                <DatePicker
                                  id="from-date-picker"
                                  defaultDate={data.start_date.toString()}
                                  label="from date"
                                  placeholder="Select a date"
                                  onChange={(dates, currentDateString) => {
                                    console.log(dates);
                                    // Handle your logic
                                    setData({ ...data, start_date: currentDateString });
                                  }}
                                />
                              </div>
                              <div className="w-full">
                                <DatePicker
                                  id="to-date-picker"
                                  defaultDate={data.end_date.toString()}
                                  label="to date"
                                  placeholder="Select a date"
                                  onChange={(dates, currentDateString) => {
                                    console.log(dates);
                                    // Handle your logic
                                    setData({ ...data, end_date: currentDateString });
                                  }}
                                />
                              </div>    
          </div>

          <div className="w-full flex justify-center items-center">
            <Button
              size="sm"
              className="w-1/3 mt-7 ml-5"
              variant="primary"
              onClick={handleSubmit}
            >
              Apply
            </Button>
          </div>

          <EnhancedDataTable<AttendanceRow>
            data={SectionLeaveReport}
            columns={columns}
          />
        </ComponentCard>
      </div>
    </>
  );
}
