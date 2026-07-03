import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import axios from "../../api/axios";
import { useState, useEffect } from "react";
import moment from "moment";
import _ from "lodash";
import { ToastContainer, toast } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";
import DatePicker from "../../components/form/date-picker";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import Radio from "../../components/form/input/Radio";

type UserRow = {
  id?: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  date_joined?: string;
};

type UserFormData = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  erpid: string;
  verify_password: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
};

export default function CreateUser() {
  const [users, setUsers] = useState<UserRow[]>([]);

  const [data, setData] = useState<UserFormData>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    erpid: "",
    verify_password: "",
    is_staff: false,
    is_active: true,
    is_superuser: false,
    date_joined: moment().format("YYYY-MM-DD"),
  });

  const [fielderror, setFieldError] = useState<Record<string, string>>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    verify_password: "",
    erpid: "",
    is_staff: "",
    is_active: "",
    is_superuser: "",
    date_joined: "",
  });

  useEffect(() => {
    getUsers();
  }, []);

  const getUsers = async () => {
    try {
      const response = await axios.get("/users/get_auth_users/");
      if (response.data) {
        const usersData = response.data.map((user: any) => ({
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          is_staff: user.is_staff,
          is_active: user.is_active,
          is_superuser: user.is_superuser,
        }));
        setUsers(usersData);
      } else {
        setUsers([]);
      }


    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };
  const handleDeleteUser = async (userId: number) => {
    try {
      if (window.confirm("Are you sure you want to delete this user by removing record?")) {
        await axios.post(`/users/delete_user/${userId}/`);
        toast.success("User deleted successfully");
        getUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };
  const handleResetPassword = async (userId: number) => {
    try {
      if (window.confirm("Are you sure you want to reset the password for this user?")) {
        await axios.post(`/users/reset_password/${userId}/`);
        toast.success("Password reset successfully");
        getUsers();
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    }
  };
  const columns: ColumnDef<UserRow>[] = [

    {
      header: "Username",
      accessorKey: "username",
    },
    {
      header: "First Name",
      accessorKey: "first_name",
    },
    {
      header: "Last Name",
      accessorKey: "last_name",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Staff",
      accessorKey: "is_staff",
      cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
    },
    {
      header: "Active",
      accessorKey: "is_active",
      cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
    },
    {
      header: "Superuser",
      accessorKey: "is_superuser",
      cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
    },

    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">

          <Button
            size="xs"
            variant="danger"
            onClick={() => handleDeleteUser(row.original.id || 0)}
          >
            Delete
          </Button>
          <Button
            size="xs"

            variant="primary"
            onClick={() => handleResetPassword(row.original.id || 0)}
          >
            Reset Password
          </Button>
        </div>
      ),
    },
  ];

  const createUser = async (userData: UserFormData) => {
    try {
      // Validation
      const errors: Record<string, string> = {};

      if (!userData.username) errors.username = "Username is required";
      if (!userData.first_name) errors.first_name = "First name is required";
      if (!userData.last_name) errors.last_name = "Last name is required";
      if (!userData.email) errors.email = "Email is required";
      if (!userData.password) errors.password = "Password is required";
      if (!userData.erpid) errors.erpid = "ERP ID is required";
      if (!userData.verify_password)
        errors.verify_password = "Password verification is required";
      if (userData.password !== userData.verify_password) {
        errors.verify_password = "Passwords do not match";
      }
      if (!userData.date_joined) errors.date_joined = "Date joined is required";

      if (Object.keys(errors).length > 0) {
        setFieldError(errors);
        toast.error("Please fix all validation errors");
        return;
      }

      const response = await axios.post("/users/create_user/", userData);
      console.log("User created successfully:", response.data);

      // Reset form
      setData({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        erpid: "",
        verify_password: "",
        is_staff: false,
        is_active: true,
        is_superuser: false,
        date_joined: moment().format("YYYY-MM-DD"),
      });
      setFieldError({});
      getUsers();
      toast.success("User created successfully");

    } catch (error) {
      toast.error("Failed to create user:" + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  return (
    <>
      <PageMeta
        title="ISMO - Create User"
        description="ISMO Admin Dashboard - Create User"
      />
      <PageBreadcrumb pageTitle="Create User" />
      <div className="space-y-6">
        <ComponentCard title="Create New User">
          <ToastContainer position="bottom-right" />

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-4">
            <div className="w-full">
              <Label>Username</Label>
              <Input
                type="text"
                placeholder="Enter username"
                value={data.username}
                onChange={(e) => setData({ ...data, username: e.target.value })}
                error={!!fielderror.username}
                hint={fielderror.username}
              />
            </div>

            <div className="w-full">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                error={!!fielderror.email}
                hint={fielderror.email}
              />
            </div>

            <div className="w-full">
              <Label>First Name</Label>
              <Input
                type="text"
                placeholder="Enter first name"
                value={data.first_name}
                onChange={(e) =>
                  setData({ ...data, first_name: e.target.value })
                }
                error={!!fielderror.first_name}
                hint={fielderror.first_name}
              />
            </div>

            <div className="w-full">
              <Label>Last Name</Label>
              <Input
                type="text"
                placeholder="Enter last name"
                value={data.last_name}
                onChange={(e) =>
                  setData({ ...data, last_name: e.target.value })
                }
                error={!!fielderror.last_name}
                hint={fielderror.last_name}
              />
            </div>

            <div className="w-full">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                error={!!fielderror.password}
                hint={fielderror.password}
              />
            </div>

            <div className="w-full">
              <Label>Verify Password</Label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={data.verify_password}
                onChange={(e) =>
                  setData({ ...data, verify_password: e.target.value })
                }
                error={!!fielderror.verify_password}
                hint={fielderror.verify_password}
              />
            </div>

            <div className="w-full">
              <DatePicker
                id="date-joined-picker"
                defaultDate={data.date_joined}
                label="Date Joined"
                placeholder="Select date joined"
                onChange={(dates, currentDateString) => {
                  console.log("Selected date:", dates);
                  setData({ ...data, date_joined: currentDateString });
                }}
              />
            </div>

            <div className="w-full">
              <Label>Superuser Status</Label>
              <Select
                options={[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" },
                ]}
                placeholder="Select superuser status"
                defaultValue={data.is_superuser ? "true" : "false"}
                onChange={(value) => {
                  setData({ ...data, is_superuser: value === "true" });
                }}
                error={!!fielderror.is_superuser}
                hint={fielderror.is_superuser}
              />
            </div>
            <div className="w-full">
              <Label>Erp Id</Label>
              <Input
                type="text"
                placeholder="Enter ERP ID"
                value={data.erpid}
                onChange={(e) => setData({ ...data, erpid: e.target.value })}
                error={!!fielderror.erpid}
                hint={fielderror.erpid}
              />
            </div>

          </div>

          <div className="flex justify-center items-center gap-12 my-6">
            <div className="flex items-center gap-2">
              <Label className="mr-2">Is Staff</Label>
              <Radio
                id="staff-yes"
                name="is_staff"
                value="1"
                checked={data.is_staff === true}
                label="Yes"
                onChange={() => setData({ ...data, is_staff: true })}
              />
              <Radio
                id="staff-no"
                name="is_staff"
                value="0"
                checked={data.is_staff === false}
                label="No"
                onChange={() => setData({ ...data, is_staff: false })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="mr-2">Is Active</Label>
              <Radio
                id="active-yes"
                name="is_active"
                value="1"
                checked={data.is_active === true}
                label="Yes"
                onChange={() => setData({ ...data, is_active: true })}
              />
              <Radio
                id="active-no"
                name="is_active"
                value="0"
                checked={data.is_active === false}
                label="No"
                onChange={() => setData({ ...data, is_active: false })}
              />
            </div>
          </div>

          <div className="w-full flex justify-center items-center">
            <Button
              size="sm"
              className="w-1/3 mt-7"
              variant="primary"
              onClick={() => createUser(data)}
            >
              Create User
            </Button>
          </div>

          <EnhancedDataTable<UserRow> data={users} columns={columns} />
        </ComponentCard>
      </div>
    </>
  );
}
