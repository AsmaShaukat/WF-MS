import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import { toast, ToastContainer } from "react-toastify";
import axios from "../../api/axios"; // Adjust the import path as necessary
export default function ChangePassword() {
    type ChangePasswordProps = {
        user_id?: string;
    old_password: string;
    new_password1: string;
    new_password2: string;
  };
    const [data, setData] = useState<ChangePasswordProps>({
      user_id: JSON.parse(localStorage.getItem("user") || "{}").user_id,
    old_password: "",
    new_password1: "",
    new_password2: "",
    });
  

    const [err, setError] = useState<ChangePasswordProps>({
    old_password: "",
    new_password1: "",
    new_password2: "",
  });
  const changePassword = async () => {
    // Logic to handle password change
    const { old_password, new_password1, new_password2 } = data;
    if (old_password === "" || new_password1 === "" || new_password2 === "") {
      setError({
        old_password: old_password === "" ? "Current password is required" : "",
        new_password1: new_password1 === "" ? "New password is required" : "",
        new_password2: new_password2 === "" ? "Confirm new password is required" : "",
      });
      return;
    }
    if (new_password1 !== new_password2) {
      toast.error("New passwords do not match");
      return;
      }

      try {
          const response = await axios.post("/users/change-password/", data);
            if (response.status === 200) {
                toast.success("Password changed successfully");
                setData({
                  old_password: "",
                  new_password1: "",
                  new_password2: "",
                });
          }
          else {
            toast.error(response.data.error || "Failed to change password");
          }
      }
      catch (error) {
        console.error("Error changing password:", error);
        toast.error("Failed to change password");
      }

    // Call API to change password
  };
  return (
    <>
      <PageMeta
        title="ISMO LEAVE SYSTEM - Change Password"
        description="This is ISMO Leave System, a web application for managing employee leave requests. & Change Password"
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Change Password
        </h3>
        <div className="space-y- grid grid-cols-2 gap-6">
          <div className="col-span-2 lg:col-span-1">
            <Label htmlFor="old_password">Current Password</Label>
            <Input
              id="old_password"
              name="old_password"
              type="password"
              value={data.old_password}
              onChange={(e) =>
                setData({ ...data, old_password: e.target.value })
              }
              error={!!err.old_password}
              hint={err.old_password}
              placeholder="Enter current password"
            />
          </div>

          <div className="col-span-2 lg:col-span-1">
            <Label htmlFor="new_password1">New Password</Label>
            <Input
              id="new_password1"
              name="new_password1"
                          type="password"
                value={data.new_password1}
              onChange={(e) =>
                setData({ ...data, new_password1: e.target.value })
              }
                error={!!err.new_password1}
              hint={err.new_password1}
              placeholder="Enter new password"
            />
          </div>

          <div className="col-span-2 lg:col-span-1">
            <Label htmlFor="new_password2">Confirm New Password</Label>
            <Input
              id="new_password2"
              name="new_password2"
              type="password"
              value={data.new_password2}
              onChange={(e) =>
                setData({ ...data, new_password2: e.target.value })
              }
                error={!!err.new_password2}
              hint={err.new_password2}
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Button
            size="sm"
            className="w-1/4 mt-7 ml-5"
            variant="primary"
            onClick={changePassword}
          >
            Apply
          </Button>
              </div>
              <ToastContainer position="bottom-right" />
      </div>
    </>
  );
}
