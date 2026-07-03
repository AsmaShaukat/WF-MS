import PageMeta from "../../components/common/PageMeta";
import BasicCard from "../../components/cards/BasicCard";
import { UserIcon } from "../../icons";
import { useEffect, useState } from "react";
import axios from "../../api/axios";
import PieChart from "../Charts/PieChart"
import { Link } from "react-router-dom";
export default function Home() {
    const [data, setData] = useState<any>({});
    const getEmployeesInfo = async() => {
        // Fetch employee data from API or state
        const response = await axios.get("/users/info/");
        setData(response.data);
    };
    
    useEffect(() => {
      getEmployeesInfo();
    }, []);
  return (
    <>
      <PageMeta
        title="ISMO - Attendance Management System"
        description="Dashboard for managing attendance and performance metrics"
      />

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <BasicCard
          title="Employees"
          value={data.total_employees || 0}
          icon={
            <UserIcon className="text-green-400 size-6 dark:text-white/90" />
          }
          badgeclr="success"
          percentage={
            data.present_today
              ? `${((data.present_today / data.total_employees) * 100).toFixed(
                  2
                )}%`
              : "0%"
          }
        />
        <BasicCard
          title="Present Today"
          value={data.present_today || 0}
          icon={
            <UserIcon className="text-green-400 size-6 dark:text-white/90" />
          }
          badgeclr="success"
          percentage={
            data.total_employees
              ? `${((data.present_today / data.total_employees) * 100).toFixed(
                  2
                )}%`
              : "0%"
          }
        />
        <BasicCard
          title="Absent Today"
          value={data.absent_today || 0}
          icon={<UserIcon className="text-red-500 size-6 dark:text-white/90" />}
          badgeclr="error"
          percentage={
            data.total_employees
              ? `${((data.absent_today / data.total_employees) * 100).toFixed(
                  2
                )}%`
              : "0%"
          }
        />
      </div>
      <h2 className="text-lg font-semibold my-5 animate-pulse bg-gray-500 rounded-2xl px-2 py-2 shadow-2xl shadow-red-300 z-10 text-white float-right">
        <Link to="/attendance/individual-user">View Attendance</Link>
      </h2>
      <div className="col-span-1 lg:col-span-2">
        <PieChart
          present={data.present_today}
          absent={data.absent_today}
          total={data.total_employees}
        />
      </div>
    </>
  );
}
