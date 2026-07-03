import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import Radio from "../../components/form/input/Radio";
import { useAuth } from "../../context/AuthContext";


// ----------------------------
// Types for Employees
// ----------------------------
type EmployeeRow = {
  id?: number;
  erp_id: string;
  hris_id: string;
  name: string;
  cnic: string;
  gender: string;
  section_id: string;
  location_id: string;
  grade_id: string;
  designation_id: string;
  position: string;
  flag: boolean;
};

type EmployeeFormData = {
  erp_id: string;
  hris_id: string;
  name: string;
  cnic: string;
  gender: string;
  section_id: string;
  location_id: string;
  grade_id: string;
  designation_id: string;
  position: string;
  flag: boolean;
};

// ----------------------------
// Types for Details API
// ----------------------------
type Section = { id: number; name: string };
type Location = { id: number; name: string };
type Grade = { id: number; name: string };
type Designation = { id: number; title: string };

export default function AddEmployee() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const { user } = useAuth();
  console.log("Current User:", user);
  // details state
  const [sections, setSections] = useState<Section[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [hrisid, setHrisId] = useState<number>(0);

  const [data, setData] = useState<EmployeeFormData>({
    erp_id: "",
    hris_id: "",
    name: "",
    cnic: "",
    gender: "",
    section_id: "",
    location_id: "",
    grade_id: "",
    designation_id: "",
    position: "",
    flag: true,
  });

  const emptyErrors: Record<string, string> = {
    erp_id: "",
    hris_id: "",
    name: "",
    cnic: "",
    gender: "",
    section_id: "",
    location_id: "",
    grade_id: "",
    designation_id: "",
    position: "",
    flag: "",
  };
  const [fielderror, setFieldError] =
    useState<Record<string, string>>(emptyErrors);

  useEffect(() => {
    getEmployees();
    getDetails();
  }, []);

  // ----------------------------
  // Fetch employees
  // ----------------------------
  const getEmployees = async () => {
    try {
      const response = await axios.get("/users/get_employees/");
      if (response.data) {
        // The API returns nested objects for section, location, grade, and designation.
        // We need to flatten them to just their IDs for the table and form.
        const employeesData = response.data.employees.map((emp: any) => ({
          id: emp.id,
          erp_id: String(emp.erp_id),
          hris_id: String(emp.hris_id),
          name: emp.name,
          cnic: emp.cnic,
          gender: emp.gender,
          section_id: emp.section?.id ? String(emp.section.id) : "",
          location_id: emp.location?.id ? String(emp.location.id) : "",
          grade_id: emp.grade?.id ? String(emp.grade.id) : "",
          designation_id: emp.designation?.id ? String(emp.designation.id) : "",
          position: emp.position,
          flag: !!emp.flag,
        }));
        setEmployees(employeesData);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  // ----------------------------
  // Fetch dropdown details
  // ----------------------------
  const getDetails = async () => {
    try {
      const response = await axios.get("/users/details/");

      if (response.data) {
        setSections(response.data.sections || []);
        setLocations(response.data.locations || []);
        setGrades(response.data.grades || []);
        setDesignations(response.data.designations || []);
        setHrisId(response.data.new_hris_id || 0);
        setData((prevData) => ({
          ...prevData,
          hris_id: response.data.new_hris_id || 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      toast.error("Failed to load employee details");
    }
  };

  // ----------------------------
  // Delete employee
  // ----------------------------
  const handleDeleteEmployee = async (employeeId: number) => {
    try {
      if (window.confirm("Are you sure you want to change the status (inactive) of this employee?")) {
        await axios.post(`/users/delete_employee/${employeeId}/`);
        toast.success("Employee Status changed successfully");
        getEmployees();
      }
    } catch (error) {
      console.error("Error changing status employee:", error);
      toast.error("Failed to change employee status");
    }
  };

  // ----------------------------
  // Validation + Create employee
  // ----------------------------
  const createEmployee = async (empData: EmployeeFormData) => {
    try {
      const errors: Record<string, string> = {};

      if (!empData.erp_id) errors.erp_id = "ERP ID is required";
      if (!empData.hris_id) errors.hris_id = "HRIS ID is required";
      if (!empData.name) errors.name = "Name is required";
      if (!empData.cnic) {
        errors.cnic = "CNIC is required";
      } else if (!/^\d{13}$/.test(empData.cnic)) {
        errors.cnic = "CNIC must be 13 digits";
      }
      if (!empData.gender) errors.gender = "Gender is required";
      if (!empData.section_id) errors.section_id = "Section is required";
      if (!empData.location_id) errors.location_id = "Location is required";
      if (!empData.grade_id) errors.grade_id = "Grade is required";
      if (!empData.designation_id)
        errors.designation_id = "Designation is required";
      if (!empData.position) errors.position = "Position is required";

      if (Object.keys(errors).length > 0) {
        setFieldError(errors);
        toast.error("Please fix all validation errors");
        return;
      }
      await axios.post("/users/create_employee/", empData);

      // Reset form
      setData({
        erp_id: "",
        hris_id: "",
        name: "",
        cnic: "",
        gender: "",
        section_id: "",
        location_id: "",
        grade_id: "",
        designation_id: "",
        position: "",
        flag: true,
      });
      setFieldError(emptyErrors);
      getEmployees();
      toast.success("Employee created successfully");
    } catch (error) {
      toast.error(
        "Failed to create employee:" +
        (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // ----------------------------
  // Table columns
  // ----------------------------
  const columns: ColumnDef<EmployeeRow>[] = [
    { header: "ID", accessorKey: "id" },
    { header: "ERP ID", accessorKey: "erp_id" },
    { header: "HRIS ID", accessorKey: "hris_id" },
    { header: "Name", accessorKey: "name" },
    { header: "CNIC", accessorKey: "cnic" },
    { header: "Gender", accessorKey: "gender" },
    {
      header: "Section",
      accessorKey: "section_id",
      cell: ({ getValue }) => {
        const id = getValue<string>();
        return sections.find((s) => String(s.id) === id)?.name || id;
      },
    },
    {
      header: "Location",
      accessorKey: "location_id",
      cell: ({ getValue }) => {
        const id = getValue<string>();
        return locations.find((l) => String(l.id) === id)?.name || id;
      },
    },
    {
      header: "Grade",
      accessorKey: "grade_id",
      cell: ({ getValue }) => {
        const id = getValue<string>();
        return grades.find((g) => String(g.id) === id)?.name || id;
      },
    },
    {
      header: "Designation",
      accessorKey: "designation_id",
      cell: ({ getValue }) => {
        const id = getValue<string>();
        return designations.find((d) => String(d.id) === id)?.title || id;
      },
    },
    { header: "Position", accessorKey: "position" },
    {
      header: "Flag",
      accessorKey: "flag",
      cell: ({ getValue }) => (getValue<boolean>() ? "Active" : "Inactive"),
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        user?.user_id === 3 && (row.original?.flag === true ?
          <Button
            size="xs"
            variant="danger"
            onClick={() => handleDeleteEmployee(row.original.id || 0)}
          >
            Disable
          </Button>
          :
          <Button
            size="xs"
            variant="primary"
            onClick={() => handleDeleteEmployee(row.original.id || 0)}
          >
            Enable
          </Button>
        )
      ),
    },
  ];

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <>
      <PageMeta
        title="ISMO - Create Employee"
        description="ISMO Admin Dashboard - Create Employee"
      />
      <PageBreadcrumb pageTitle="Create Employee" />
      <div className="space-y-6">
        <ComponentCard title="Create New Employee">
          <ToastContainer position="bottom-right" />

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-4">
            <div className="w-full">
              <Label>ERP ID</Label>
              <Input
                type="text"
                placeholder="Enter ERP ID"
                value={data.erp_id}
                onChange={(e) => setData({ ...data, erp_id: e.target.value })}
                error={!!fielderror.erp_id}
                hint={fielderror.erp_id}
              />
            </div>

            <div className="w-full">
              <Label>HRIS ID</Label>
              <Input
                type="text"
                placeholder="Enter HRIS ID"
                value={hrisid}
                disabled
                error={!!fielderror.hris_id}
                hint={fielderror.hris_id}
              />
            </div>

            <div className="w-full">
              <Label>Name</Label>
              <Input
                type="text"
                placeholder="Enter name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                error={!!fielderror.name}
                hint={fielderror.name}
              />
            </div>

            <div className="w-full">
              <Label>CNIC</Label>
              <Input
                type="text"
                placeholder="Enter CNIC (13 digits)"
                value={data.cnic}
                onChange={(e) => setData({ ...data, cnic: e.target.value })}
                error={!!fielderror.cnic}
                hint={fielderror.cnic}
              />
            </div>

            <div className="w-full">
              <Label>Gender</Label>
              <Select
                options={[
                  { label: "Male", value: "M" },
                  { label: "Female", value: "F" },
                  { label: "Other", value: "O" },
                ]}
                placeholder="Select gender"
                defaultValue={data.gender}
                onChange={(value) => setData({ ...data, gender: value })}
                error={!!fielderror.gender}
                hint={fielderror.gender}
              />
            </div>

            <div className="w-full">
              <Label>Section</Label>
              <Select
                options={sections.map((s) => ({
                  label: s.name,
                  value: String(s.id),
                }))}
                placeholder="Select section"
                defaultValue={data.section_id}
                onChange={(value) => setData({ ...data, section_id: value })}
                error={!!fielderror.section_id}
                hint={fielderror.section_id}
              />
            </div>

            <div className="w-full">
              <Label>Location</Label>
              <Select
                options={locations.map((l) => ({
                  label: l.name,
                  value: String(l.id),
                }))}
                placeholder="Select location"
                defaultValue={data.location_id}
                onChange={(value) => setData({ ...data, location_id: value })}
                error={!!fielderror.location_id}
                hint={fielderror.location_id}
              />
            </div>

            <div className="w-full">
              <Label>Grade</Label>
              <Select
                options={grades.map((g) => ({
                  label: g.name,
                  value: String(g.id),
                }))}
                placeholder="Select grade"
                defaultValue={data.grade_id}
                onChange={(value) => setData({ ...data, grade_id: value })}
                error={!!fielderror.grade_id}
                hint={fielderror.grade_id}
              />
            </div>

            <div className="w-full">
              <Label>Designation</Label>
              <Select
                options={designations.map((d) => ({
                  label: d.title,
                  value: String(d.id),
                }))}
                placeholder="Select designation"
                defaultValue={data.designation_id}
                onChange={(value) =>
                  setData({ ...data, designation_id: value })
                }
                error={!!fielderror.designation_id}
                hint={fielderror.designation_id}
              />
            </div>

            <div className="w-full">
              <Label>Position</Label>
              <Input
                type="text"
                placeholder="Enter Position"
                value={data.position}
                onChange={(e) => setData({ ...data, position: e.target.value })}
                error={!!fielderror.position}
                hint={fielderror.position}
              />
            </div>

            <div className="w-full">
              <Label>Flag</Label>
              <div className="mt-2 flex gap-3">
                <Radio
                  id="flag-yes"
                  name="flag"
                  value="1"
                  checked={data.flag === true}
                  label="Active"
                  onChange={() => setData({ ...data, flag: true })}
                />
                <Radio
                  id="flag-no"
                  name="flag"
                  value="0"
                  checked={data.flag === false}
                  label="Inactive"
                  onChange={() => setData({ ...data, flag: false })}
                />
              </div>
            </div>
          </div>

          <div className="w-full flex justify-center items-center">
            <Button
              size="sm"
              className="w-1/3 mt-7"
              variant="primary"
              onClick={() => createEmployee(data)}
            >
              Create Employee
            </Button>
          </div>

          <EnhancedDataTable<EmployeeRow> data={employees} columns={columns} />
        </ComponentCard>
      </div>
    </>
  );
}
