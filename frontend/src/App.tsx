import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import DataTableOne from "./pages/Tables/TodaysAttendance";
import AttendanceHistory from "./pages/Tables/AttendanceHistory";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import SectionAttendanceReport from "./pages/Tables/SectionAttendanceReport";
import ApplyLeave from "./pages/Leaves/ApplyLeave";
import PublicHoliday from "./pages/Leaves/PublicHolidays";
// import TodaysAttendance from "./pages/Tables/TodaysAttendance";
import IndividualAttendance from "./pages/Tables/IndividualAttendance";
import CreateUser from "./pages/UserManagement/CreateUser";
import AssignRights from "./pages/UserManagement/AssignRights";
import MainMenu from "./pages/Menus/MainMenu";
import SubMenu from "./pages/Menus/SubMenu";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Home from "./pages/Dashboard/Home";
import AttendanceOverview from "./pages/Attendance/AttendanceOverview";
import PresentAbsent from "./pages/Attendance/PresentAbsent";
import OfficialWork from "./pages/Leaves/OfficialWork";
import ChangePassword from "./pages/UserManagement/ChangePassword";
import DetailedReport from "./pages/Attendance/DetailedReport";
import TeamLevel from "./pages/Attendance/TeamLevel";
import IndividualUser from "./pages/Attendance/IndividualUser";
import ShiftAttendance from "./pages/Attendance/ShiftAttendance";
import ShiftHistory from "./pages/Attendance/ShiftHistory";
import RccShift from "./pages/Attendance/RccShift";
import AddEmployee from "./pages/UserManagement/AddEmployee";
import RccUpdateAttendance from "./pages/Attendance/RccUpdateAttendance";
import NccUpdateAttendance from "./pages/Attendance/NccUpdateAttendance";
import LeaveHistory from "./pages/Leaves/LeaveHistory";
import IndividualLeaveReport from "./pages/Leaves/IndividualLeaveReport";
import SectionLeaveReport from "./pages/Leaves/SectionLeave";
import IndividualDetailLeaveReport from "./pages/Leaves/IndividualDetailLeaveReport";
import EachLeaveDetail from "./pages/Leaves/EachLeaveDetail";
import EmpDailyActivities     from "./pages/WorkforceActivityManagement/EmpDailyActivities";
import ActivitiesReport     from "./pages/WorkforceActivityManagement/ActivitiesReport";
import DeptDashboard     from "./pages/WorkforceActivityManagement/DeptDashboard";
import OrgDashboard     from "./pages/WorkforceActivityManagement/OrgDashboard";
import MainTaskReport from "./pages/WorkforceActivityManagement/MainTaskReport";// Ab — function ka naam change hua
import BusinessPlan from "./pages/WorkforceActivityManagement/BusinessPlan";
import AttendanceReport from "./pages/WorkforceActivityManagement/AttendanceReport";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" index element={<Home />} />
              
              <Route path="/business-plan" element={<BusinessPlan />} />
              <Route path="/emp-daily-activities"  element={<EmpDailyActivities />} />
              <Route path="/activities-report"  element={<ActivitiesReport />} />
              <Route path="/business-plan/attendance-report" element={<AttendanceReport/>} />
              <Route path="/org-dashboard"  element={<OrgDashboard />} />
              <Route path="/dept-dashboard"  element={<DeptDashboard />} />
              <Route path="/business-plan/main-task-report" element={<MainTaskReport />} />
              
              {/* Others Page */}
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />
              <Route
                path="/individual-leave-report"
                element={<IndividualLeaveReport />}
              />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />
              <Route path="/attendance/today" element={<DataTableOne />} />
              <Route
                path="/attendance/history"
                element={<AttendanceHistory />}
              />
              <Route
                path="/attendance/detailed-report"
                element={<DetailedReport />}
              />
              <Route path="/attendance/shifts" element={<ShiftAttendance />} />
              <Route
                path="/attendance/shift-history"
                element={<ShiftHistory />}
              />
              <Route path="/attendance/rcc-shift" element={<RccShift />} />
              <Route path="/attendance/status" element={<PresentAbsent />} />
              <Route path="/attendance/team-level" element={<TeamLevel />} />
              <Route
                path="/attendance/individual-user"
                element={<IndividualUser />}
              />
              <Route path="/leaves/official-work" element={<OfficialWork />} />
              <Route
                path="/leaves/individual-leave-detail"
                element={<IndividualDetailLeaveReport />}
              />
              <Route
                path="/leaves/leavetype-detail"
                element={<EachLeaveDetail />}
              />
              <Route
                path="/leaves/section-leave-report"
                element={<SectionLeaveReport />}
              />
              <Route path="/leaves/leave-history" element={<LeaveHistory />} />
              <Route
                path="/attendance/individual"
                element={<IndividualAttendance />}
              />
              <Route
                path="/attendance/rcc-update"
                element={<RccUpdateAttendance />}
              />
              <Route
                path="/attendance/ncc-update"
                element={<NccUpdateAttendance />}
              />

              <Route
                path="/attendance/section"
                element={<SectionAttendanceReport />}
              />
              <Route
                path="/attendance/overview"
                element={<AttendanceOverview />}
              />

              {/* User managment */}
              <Route path="/users/create" element={<CreateUser />} />
              <Route path="/users/add-employee" element={<AddEmployee />} />
              <Route path="/users/assign-rights" element={<AssignRights />} />

              {/* Menu Management */}
              <Route path="/create-menu" element={<MainMenu />} />
              <Route path="/sub-menu" element={<SubMenu />} />

              {/* Leaves */}
              <Route path="/leaves/apply" element={<ApplyLeave />} />
              <Route
                path="/leaves/public-holidays"
                element={<PublicHoliday />}
              />

              {/* Plugins */}
              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>
          {/* Auth Layout */}
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
