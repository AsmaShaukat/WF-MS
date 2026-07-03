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

// 1. Define Type
type MainMenuRow = {
  id: number;
  title: string;
  description: string;
};

export default function MainMenu() {
  const [data, setData] = useState({
    title: "",
    description: "",
  });

  const [records, setRecords] = useState<MainMenuRow[]>([]);

  const [fielderror, setFieldError] = useState<Record<string, string>>({
    title: "",
    description: "",
  });
 const [updateid,setUpdateId] = useState<number>(0);
  useEffect(() => {
    getRecords();
  }, []);

  const getRecords = async () => {
    try {
      const response = await axios.get("/mainmenu/get/");
      setRecords(response.data.main_menus.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
      })));
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.post(`/mainmenu/delete/${id}/`);
      toast.success("Main menu deleted successfully");
      getRecords();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete main menu");
    }
  };

    const handleSubmit = async () => {
        const errors: Record<string, string> = {};
        if (!data.title) errors.title = "Main menu title is required";
        if (!data.description) errors.description = "Description is required";

        setFieldError(errors);

        if (Object.keys(errors).length > 0) {
            toast.error("Please fix all validation errors");
            return;
        }

        if (updateid > 0) {
            try {
                await axios.post(`/mainmenu/update/${updateid}/`, data);
                toast.success("Main menu updated successfully");
                setData({ title: "", description: "" });
                setFieldError({});
                setUpdateId(0); // Reset update ID after successful update
                getRecords(); // refresh list
            } catch (error) {
                toast.error("Failed to update main menu");
            }
        } else {
            try {
                await axios.post("/mainmenu/create/", data);
                toast.success("Main menu created successfully");
                setData({ title: "", description: "" });
                setFieldError({});
                getRecords(); // refresh list
            } catch (error) {
                toast.error("Failed to create main menu");
            }
        }
    }
  const handleEdit = async (id: number) => {
    setUpdateId(id);
        try {
            const response = await axios.get(`/mainmenu/record/${id}/`);
            if (response.status === 200) {
                const menu = response.data;
                console.log("Menu for edit:", menu);
                setData({
                    title: menu.title,
                    description: menu.description,
                });
            }
        } catch (error) {
            console.error("Error fetching menu for edit:", error);
            toast.error("Failed to fetch menu for editing");
        }
    }
        // Implement edit functionality here
        
  // 2. Define Columns
  const columns: ColumnDef<MainMenuRow>[] = [
    {
      header: "Title",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
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
      <PageBreadcrumb pageTitle="Create Main Menu" />
      <div className="space-y-6">
        <ComponentCard title="Create New Main Menu">
          <ToastContainer position="bottom-right" />

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-4">
            <div className="w-full">
              <Label>Main Menu Title</Label>
              <Input
                type="text"
                placeholder="Enter main menu title"
                value={data.title}
                onChange={(e) =>
                  setData({ ...data, title: e.target.value })
                }
                error={!!fielderror.title}
                hint={fielderror.title}
              />
            </div>
            <div className="w-full">
              <Label>Description</Label>
              <Input
                type="text"
                placeholder="Enter description"
                value={data.description}
                onChange={(e) =>
                  setData({ ...data, description: e.target.value })
                }
                error={!!fielderror.description}
                hint={fielderror.description}
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
              {updateid>0?'Update Main Menu':'Add Main Menu'}
            </Button>
          </div>
        </ComponentCard>

        {/* 3. Display table below the form */}
        <ComponentCard title="Main Menu Records">
          <EnhancedDataTable<MainMenuRow> data={records} columns={columns} />
        </ComponentCard>
      </div>
    </>
  );
}
