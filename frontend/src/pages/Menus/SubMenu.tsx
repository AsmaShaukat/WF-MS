import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import axios from "../../api/axios";
import { useEffect, useState } from "react";
import _ from "lodash";
import { ToastContainer, toast } from "react-toastify";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { ColumnDef } from "@tanstack/react-table";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import SearchableDropdown from "../../components/form/input/SearchableDropDown";

// 1. Define Type
type submenuRow = {
  id: number;
  mainmenu: any;
  uri: string;
  submenu: string;
};

export default function SubMenu() {
  const [mainmenu, setMainMenu] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState({
    menuid: 0,
    submenu: "",
    uri: "",
  });

  const [records, setRecords] = useState<submenuRow[]>([]);

  const [fielderror, setFieldError] = useState<Record<string, string>>({
    menuid: "",
    submenu: "",
    uri: "",
  });
  const [updateid, setUpdateId] = useState<number>(0);
  useEffect(() => {
    getMainMenus();
    getRecords();
  }, []);

  const getRecords = async () => {
    try {
      const response = await axios.get("/submenu/get/");
      if (response.status === 200) {
        const submenuData = response.data.map((item: any) => ({
          id: item.id,
          mainmenu: item.mainmenu,
          submenu: item.submenu,
          uri: item.uri,
        }));
        setRecords(submenuData);
      }
    } catch (error) {
      console.error("Error fetching submenu records:", error);
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
      console.error("Error fetching records:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.post(`/submenu/delete/${id}/`);
      toast.success("Main menu deleted successfully");
      getRecords();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete main menu");
    }
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!data.menuid) errors.menuid = "Main menu ID is required";
    if (!data.submenu) errors.submenu = "Sub menu title is required";

    setFieldError(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fix all validation errors");
      return;
    }

    if (updateid > 0) {
      try {
        await axios.post(`/submenu/update/${updateid}/`, data);
        toast.success("Main menu updated successfully");
        setData({ menuid: 0, submenu: "", uri: "" });
        setFieldError({});
        setUpdateId(0); // Reset update ID after successful update
        getRecords(); // refresh list
      } catch (error) {
        toast.error("Failed to update main menu");
      }
    } else {
      try {
        await axios.post("/submenu/create/", data);
        toast.success("Main menu created successfully");
        setData({ menuid: 0, submenu: "", uri: "" });
        setFieldError({});
        getRecords(); // refresh list
      } catch (error) {
        toast.error("Failed to create main menu");
      }
    }
  };

  const handleEdit = async (id: number) => {
    setUpdateId(id);
    try {
      const response = await axios.get(`/submenu/record/${id}/`);
      if (response.status === 200) {
        const menu = response.data;
        setData({
          menuid: menu.menuid,
          submenu: menu.sub_menu,
          uri: menu.uri,
        });
      }
    } catch (error) {
      console.error("Error fetching menu for edit:", error);
      toast.error("Failed to fetch menu for editing");
    }
  };

  // Implement edit functionality here

  // 2. Define Columns
  const columns: ColumnDef<submenuRow>[] = [
    {
      header: "Main Menu",
      accessorKey: "mainmenu",
    },
    {
      header: "Sub Menu",
      accessorKey: "submenu",
    },
    {
      header: "URI",
      accessorKey: "uri",
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            size="xs"
            variant="primary"
            onClick={() => handleEdit(row.original.id)}
          >
            Edit
          </Button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-4">
            <div className="w-full">
              <SearchableDropdown
                options={mainmenu.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                placeholder="Select a menu"
                label="Main Menu"
                id="menu-dropdown"
                value={
                  updateid == 0
                    ? data.menuid
                    : mainmenu.find((item) => item.id === data.menuid)?.id || 0
                }
                onChange={(value) => {
                  setData({
                    ...data,
                    menuid: value ? parseInt(value.toString(), 10) : 0,
                  });
                }}
                error={!!fielderror.menuid}
                hint={fielderror.menuid}
              />
            </div>
            <div className="w-full">
              <Label>Sub Menu</Label>
              <Input
                type="text"
                placeholder="Enter sub menu"
                value={data.submenu}
                onChange={(e) => setData({ ...data, submenu: e.target.value })}
                error={!!fielderror.submenu}
                hint={fielderror.submenu}
              />
            </div>
            <div className="w-full">
              <Label>URI</Label>
              <Input
                type="text"
                placeholder="Enter URI"
                value={data.uri}
                onChange={(e) => setData({ ...data, uri: e.target.value })}
                error={!!fielderror.uri}
                hint={fielderror.uri}
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
              {updateid > 0 ? "Update Sub Menu" : "Add Sub Menu"}
            </Button>
          </div>
        </ComponentCard>

        {/* 3. Display table below the form */}
        <ComponentCard title="Sub Menu Records">
          <EnhancedDataTable<submenuRow> data={records} columns={columns} />
        </ComponentCard>
      </div>
    </>
  );
}
