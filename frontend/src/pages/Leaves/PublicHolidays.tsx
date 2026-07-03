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
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
      


type HolidayData = {
    id?: number; // Optional for new entries
    date: string;
    name: string;
    description: string;
};

export default function PublicHoliday() {
const [attendancedata, setAttendanceData] = useState<HolidayData[]>([]);
    

    const [holidayData, setHolidayData] = useState<HolidayData>({ date:moment().format('YYYY-MM-DD'), name: "", description: "" });
    const [fielderror, setFieldError] = useState<HolidayData>({
        date: "",
        name: "",
        description: ""
    });
    const [updateid, setUpdateId] = useState<number | null>(null);
    
   
    useEffect(() => {
        
        fetchAttendanceData();
    }, []);

           const fetchAttendanceData = async () => {
             try {
               const response = await axios.get("/holidays/get");

               // Ensure response.data is an array and format timestamp
               const cleanedData: HolidayData[] = response.data.map(
                 (item: any) => {
                   const picked = _.pick(item, [
                     "id",
                     "date",
                     "name",
                     "description",
                   ]);

                   return picked;
                 }
               );
               setAttendanceData(cleanedData);
             } catch (error) {
               console.error("Error fetching attendance data:", error);
             }
           };

    const handleSubmit = async () => {
       if (!holidayData.date || !holidayData.name || !holidayData.description) {
            setFieldError({
                date: !holidayData.date ? "Date is required" : "",
                name: !holidayData.name ? "Name is required" : "",
                description: !holidayData.description ? "Description is required" : ""
            });
            toast.error("Please fill all fields");
            return;
        }
       if (updateid) {
            // Update existing holiday
            try {
                const response = await axios.post(`/holidays/update/${updateid}/`, {
                    date: holidayData.date,
                    name: holidayData.name,
                    description: holidayData.description
                });
                if (response.status === 200) {
                    toast.success("Holiday updated successfully");
                 
                    setUpdateId(null);
                    setHolidayData({ date: moment().format('YYYY-MM-DD'), name: "", description: "" });
                } else {
                    toast.error("Failed to update holiday");
                }
            } catch (error) {
                console.error("Error updating holiday:", error);
                toast.error("Error updating holiday");
           }
           fetchAttendanceData(); // Refresh the attendance data after updating
       } else {
        try {
          const response = await axios.post("/holidays/store/", holidayData);

          if (response.status === 201) {
            toast.success("Holiday added successfully");
            setHolidayData({
              date: moment().format("YYYY-MM-DD"),
              name: "",
              description: "",
            });
            setFieldError({ date: "", name: "", description: "" });
            fetchAttendanceData(); // Refresh the attendance data after adding a holiday
          } else {
            toast.error("Failed to add holiday");
          }
        } catch (error) {
          console.error("Error adding holiday:", error);
          toast.error("Error adding holiday");
        }
        }
    }

    const fetchRecord = async (holidayId: number) => {
    try {
      const response = await axios.get(`/holidays/get/${holidayId}/`);
      if (response.status === 200) {
          const holiday = response.data;
          setUpdateId(holiday.id);
        setHolidayData({
            id: holiday.id,
            date: moment(holiday.date).format('YYYY-MM-DD'), // Format date to YYYY-MM-DD
            name: holiday.name,
            description: holiday.description
        });
      } else {
        toast.error("Failed to fetch holiday data");
        }
    } catch (error) {
      console.error("Error fetching holiday data:", error);
      toast.error("Error fetching holiday data");
    }
  };


    const deleteHoliday = async (holidayId: number) => {
   
        try {
            if (window.confirm("Are you sure you want to delete this holiday?")) {
                const response = await axios.post(`/holidays/delete/${holidayId}/`);
                if (response.status === 204 || response.status === 200) {
                    toast.success("Holiday deleted successfully");
                    // Refresh the attendance data after deletion
                    setAttendanceData((prev) =>
                        prev.filter((h) => h.id !== holidayId)
                    );
                } else {
                    toast.error("Failed to delete holiday");
                }
            }
            
        } catch (error) {
            console.error("Error deleting holiday:", error);    
            toast.error("Error deleting holiday");
        }
    };

    const columns: ColumnDef<HolidayData>[] = [

    {
        accessorKey: "date",
            header: "Date",
    
        cell: ({ getValue }) => moment(getValue<string>()).format("DD MMM YYYY"),
    },
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
            <div className="flex gap-2">
                <Button
                    size="xs"
                    variant="primary"
                    onClick={() => {
                        // Implement edit logic here
                        // Example: setHolidayData(row.original)
                        fetchRecord(row.original.id as number);
                    }}
                >
                    Edit
                </Button>
                <Button
                    size="xs"
                    variant="danger"
                    onClick={() => {
                        // Implement delete logic here
                        // Example: handleDelete(row.original.id)
                        if (row.original.id !== undefined) {
                            deleteHoliday(row.original.id);
                        } else {
                            toast.error("Holiday ID is missing.");
                        }
                    }}
                >
                    Delete
                </Button>
            </div>
        ),
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
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2  gap-4">
            <DatePicker
              id="holiday-date"
              mode="single"
              placeholder="Pick a date"
              defaultDate={holidayData.date.toString()}
                          onChange={(date, currentdatestring) => {
                  console.log("Selected date:", date);
                setHolidayData({ ...holidayData, date: currentdatestring });
                // You can call fetchAttendanceData with the selected date here if needed
                // Example: fetchAttendanceData(date)
              }}
            />
            <Input
              id="holiday-name"
              name="holiday-name"
              placeholder="Holiday Name"
              value={holidayData.name}
              onChange={(e) =>
                setHolidayData({ ...holidayData, name: e.target.value })
              }
              error={!!fielderror.name}
              hint={fielderror.name}
            />
            <TextArea
                          placeholder="Holiday Description"
                          className="my-3"
              value={holidayData.description}
              onChange={(val) =>
                setHolidayData({ ...holidayData, description: val })
              }
              error={!!fielderror.description}
              hint={fielderror.description}
            />
          </div>
          <div className="flex justify-center items-center mb-4">
            <Button size="md" variant="primary" onClick={handleSubmit}>
              {updateid ? "Update Holiday" : "Add Holiday"}
            </Button>

            <ToastContainer position="bottom-right" />
          </div>
          <EnhancedDataTable<HolidayData>
            data={attendancedata}
            columns={columns}
          />
        </ComponentCard>
      </div>
    </>
  );
}
