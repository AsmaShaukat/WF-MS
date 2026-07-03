import { useState } from "react";
import { Link, useNavigate } from "react-router";
import moment from "moment";
import {  EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";

import DatePicker from "../form/date-picker";
import { toast, ToastContainer } from "react-toastify";
import axios from "../../api/axios";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
  const [data, setData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    verify_password: "",
    username: "",
    erpid: "",

    date_joined: moment().format("YYYY-MM-DD"),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};

    if (!data.username) fieldErrors.username = "Username is required";
    if (!data.first_name) fieldErrors.first_name = "First name is required";
    if (!data.last_name) fieldErrors.last_name = "Last name is required";
    if (!data.email) fieldErrors.email = "Email is required";
    if (!data.password) fieldErrors.password = "Password is required";
    if (!data.verify_password)
      fieldErrors.verify_password = "Confirm your password";
    if (data.password !== data.verify_password)
      fieldErrors.verify_password = "Passwords do not match";
    if (!data.erpid) fieldErrors.erpid = "ERP ID is required";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error("Please fix the errors in the form.");
      return;
    }

    try {
      const payload = {
        ...data,
        is_superuser: false,
      };
      await axios.post("/users/signup_user/", payload);
      toast.success("User registered successfully");

      // Reset form
      setData({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        password: "",
        verify_password: "",
        erpid: "",

        date_joined: moment().format("YYYY-MM-DD"),
      });
      navigate("/dashboard");
      setErrors({});
    } catch (error: any) {
  

      toast.error(
        "Registration failed: " +
          (error?.response?.data?.error ||
            error?.response?.data?.message ||
            error.message)
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <ToastContainer position="bottom-right" />
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10" />
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fill form to sign up!
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <Input
                type="text"
                id="username"
                name="username"
                placeholder="Enter username"
                value={data.username}
                onChange={(e) => handleChange("username", e.target.value)}
                error={!!errors.username}
                hint={errors.username}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <Label>
                    First Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={data.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    error={!!errors.first_name}
                    hint={errors.first_name}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label>
                    Last Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={data.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    error={!!errors.last_name}
                    hint={errors.last_name}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <Input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={data.email}
                onChange={(e) => handleChange("email", e.target.value)}
                error={!!errors.email}
                hint={errors.email}
              />

              <div>
                <Label>
                  Password<span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={data.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    error={!!errors.password}
                    hint={errors.password}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>

              <Input
                type="password"
                placeholder="Confirm password"
                value={data.verify_password}
                onChange={(e) =>
                  handleChange("verify_password", e.target.value)
                }
                error={!!errors.verify_password}
                hint={errors.verify_password}
              />

              <Input
                type="text"
                placeholder="Enter ERP ID - Baseer AD (IT)"
                value={data.erpid}
                onChange={(e) => handleChange("erpid", e.target.value)}
                error={!!errors.erpid}
                hint={errors.erpid}
              />

              <DatePicker
                label="Date Joined"
                id="date-joined"
                defaultDate={data.date_joined}
                onChange={(dates, currentDateString) => {
                  console.log(dates);
                  handleChange("date_joined", currentDateString);
                }}
              />


              <button
                type="submit"
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
              >
                Sign Up
              </button>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
