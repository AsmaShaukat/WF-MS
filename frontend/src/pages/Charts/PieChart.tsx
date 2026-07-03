import ComponentCard from "../../components/common/ComponentCard";
import PieChartOne from "../../components/charts/pie/PieChartOne";
import PageMeta from "../../components/common/PageMeta";

type Props = {
  present: number;
    absent: number;
    total: number;
};

export default function PieChart({ present, absent, total }: Props) {
  return (
    <>
      <PageMeta
        title="ISMO Attendance Dashboard"
        description="This is the ISMO Attendance Dashboard page for monitoring attendance data."
      />
      {/* <PageBreadcrumb pageTitle="ISMO Attendance Dashboard" /> */}
      <div className="mt-10">
        <ComponentCard title="Visual Attendance Overview">
          <PieChartOne present={present} absent={absent} total={total} />
        </ComponentCard>
      </div>
    </>
  );
}
// 