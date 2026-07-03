import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

type Props = {
  present: number;
  absent: number;
  total: number;
};

export default function PieChartOne({ present, absent, total }: Props) {
  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#4CAF50", "#F44336"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "pie",
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ["#fff"], // Make text readable on dark backgrounds
      },
    },
    tooltip: {
      enabled: true,
      theme: "light", // Ensures light background with dark text
      style: {
        fontSize: "14px",
        fontFamily: "Outfit, sans-serif",
      },
    },
    labels: ["Present", "Absent"],
  };

    const totalPresentPercentage = Number(((present / total) * 100).toFixed(2));
    const totalAbsentPercentage = Number(((absent / total) * 100).toFixed(2));
    const series = [totalPresentPercentage, totalAbsentPercentage];

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="pieChartOne" className="min-w-[300px]">
        <Chart options={options} series={series} type="pie" height={310} />
        <div className="text-center mt-2 font-semibold">
          Total Employees: {total}
        </div>
      </div>
    </div>
  );
}
