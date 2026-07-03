import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import axios from "../../api/axios";
import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import Button from "../../components/ui/button/Button";

import { ColumnDef } from "@tanstack/react-table";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import SearchableDropdown from "../../components/form/input/SearchableDropDown";
import MultiSelect from "../../components/form/MultiSelect";

// 1. Define Type
type UserRightsType = {
  id: number;
  mainmenu: any;
  submenu: any;
  user: any;
};

export default function AssignRights() {
  const [mainmenu, setMainMenu] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<
    { id: number; full_name: string; email: string }[]
  >([]);
  const [submenus, setSubMenus] = useState<{ id: number; submenu: string }[]>(
    []
  );

  const [data, setData] = useState<{
    userid: number;
    menuid: number;
    submenuid: number[];
  }>({
    userid: 0,
    menuid: 0,
    submenuid: [],
  });

  const [records, setRecords] = useState<UserRightsType[]>([]);

  const [fielderror, setFieldError] = useState<Record<string, string>>({
    userid: "",
    menuid: "",
    submenuid: "",
  });

 

  useEffect(() => {
    getMainMenus();
    getUsers();
  }, []);

  const getUsers = async () => {
    try {
      const response = await axios.get("/users/get_auth_users/");
      if (response.status === 200) {
        const userData = response.data.map((item: any) => ({
          id: item.id,
          full_name: item.first_name + " " + item.last_name,
          email: item.email,
        }));
        setUsers(userData);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getSubMenus = async (id: any) => {
    try {
      const response = await axios.get(`/submenu/bymenu/${id}/`);
      if (response.status === 200) {
        const submenuData = response.data.map((item: any) => ({
          id: item.id,
          submenu: item.submenu,
        }));
        setSubMenus(submenuData);
      }
    } catch (error) {
      console.error("Error fetching submenu records:", error);
    }
  };

  const getRecords = async (id: any) => {
    try {
      const response = await axios.get(`/assignrights/get/${id}/`);
      if (response.status === 200) {
        const assignrights = response.data.map((item: any) => ({
          id: item.id,
          mainmenu: item.mainmenu,
          submenu: item.submenu,
          username: item.username,
          email: item.email,
        }));
        setRecords(assignrights);
      }
    } catch (error) {
      console.error("Error fetching assigned records:", error);
    }
  };

  const getMainMenus = async () => {
    try {
      const response = await axios.get("/mainmenu/get/");
      if (response.status === 200) {
        const menuData = response.data.main_menus.map((item: any) => ({
          id: item.id,
          name: item.name,
        }));
        setMainMenu(menuData);
      } else {
        console.error("Failed to fetch main menu data");
      }
    } catch (error) {
      console.error("Error fetching main menus:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.post(`/assignrights/delete/${id}/`);
      getRecords(data.userid);
      toast.success("Assign rights deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete assign rights");
    }
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!data.userid) errors.userid = "Employee is required";
    if (!data.menuid) errors.menuid = "Main menu is required";
    if (!data.submenuid.length) errors.submenuid = "Sub menu is required";

    setFieldError(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fix all validation errors");
      return;
    }

    try {
  
        await axios.post("/assignrights/create/", data);
        toast.success("Rights assigned successfully");
      

      setFieldError({ userid: "", menuid: "", submenuid: "" });
      setData({ userid: 0, menuid: 0, submenuid: [] });
        setSubMenus([]);
        location.reload();
      getRecords(data.userid);
    } catch (error) {
      toast.error("Failed to assign/update rights");
    }
  };

  // 2. Define Columns
  const columns: ColumnDef<UserRightsType>[] = [
    { header: "Main Menu", accessorKey: "mainmenu" },
    { header: "Sub Menu", accessorKey: "submenu" },
    { header: "Username", accessorKey: "username" },
    { header: "Email", accessorKey: "email" },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            size="xs"
            variant="danger"
            onClick={() => handleDelete(row.original.id)}
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
        title="ISMO - Create Main Menu"
        description="ISMO Admin Dashboard - Create Main Menu"
      />
      <PageBreadcrumb pageTitle="Create Sub Menu" />
      <div className="space-y-6">
        <ComponentCard title="Create New Sub Menu">
          <ToastContainer position="bottom-right" />
          <div className="grid grid-cols-1 md:grid-cols-3 mb-4 gap-4">
            <div className="w-full md:col-span-1">
              <SearchableDropdown
                options={users.map((item) => ({
                  label: item.full_name + " (" + item.email + ")",
                  value: item.id,
                }))}
                placeholder="Select an Employee"
                label="Employees"
                id="employee-dropdown"
                value={data.userid}
                onChange={(value) => {
                  const userid = value ? parseInt(value.toString(), 10) : 0;
                  setData({ ...data, userid });
                  getRecords(userid);
                }}
                error={!!fielderror.userid}
                hint={fielderror.userid}
              />
            </div>
            <div className="w-full md:col-span-1">
              <SearchableDropdown
                options={mainmenu.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                placeholder="Select a Main Menu"
                label="Main Menu"
                id="mainmenu-dropdown"
                value={data.menuid}
                onChange={async (value) => {
                  const menuid = value ? parseInt(value.toString(), 10) : 0;
                  setData({ ...data, menuid, submenuid: [] });
                  setSubMenus([]);
                  if (menuid > 0) {
                    await getSubMenus(menuid);
                  }
                }}
                error={!!fielderror.menuid}
                hint={fielderror.menuid}
              />
            </div>
            <div className="w-full md:col-span-1">
              <MultiSelect
                options={submenus.map((item) => ({
                  value: item.id.toString(),
                  text: item.submenu,
                }))}
                label="Sub Menu"
                defaultSelected={data.submenuid.map((id) => id.toString())}
                onChange={(selected) => {
                  setData({
                    ...data,
                    submenuid: selected.map((item) => parseInt(item, 10)),
                  });
                }}
                disabled={data.menuid === 0}
              />
            </div>
          </div>

          <div className="w-full flex justify-center items-center">
            <Button
              size="sm"
              className="w-1/3 mt-7"
              variant="primary"
              onClick={handleSubmit}
            >
              Add Rights
            </Button>
          </div>
        </ComponentCard>

        <ComponentCard title="Sub Menu Records">
          <EnhancedDataTable<UserRightsType> data={records} columns={columns} />
        </ComponentCard>
      </div>
    </>
  );
}
