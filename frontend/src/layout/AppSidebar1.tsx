import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import axios from "../api/axios";
import _ from "lodash";
import { ClipboardList, FileText, BarChart2, Building2, Globe } from "lucide-react";

// Assume these icons are imported from an icon library
import {
  //   BoxCubeIcon,
  //   CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  //   ListIcon,
  //   PageIcon,
  //   PieChartIcon,
  //   PlugInIcon,
  //   TableIcon,
  LeaveIcon,
  BiometricRecognitionIcon,
  UserCircleIcon,
  ListIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [{ name: "Live Attendance", path: "/", pro: false }],
  },
  {
    icon: <UserCircleIcon />,
    name: "User Management",
    subItems: [
      { name: "Create User", path: "/users/create", pro: false },
      { name: "Assign Rights", path: "/users/assign-rights", pro: false },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Menu Management",
    subItems: [
      { name: "Create Menu", path: "/create-menu", pro: false },
      { name: "Sub Menu", path: "/sub-menu", pro: false },
    ],
  },

  {
    icon: <BiometricRecognitionIcon />,
    name: "Biometric Attendance",
    subItems: [
      { name: "Today's Attendance", path: "/attendance/today", pro: false },
      { name: "Attendance History", path: "/attendance/history", pro: false },
      { name: "Section Attendance", path: "/attendance/section", pro: false },
      {
        name: "Individual Attendance",
        path: "/attendance/individual",
        pro: false,
      },
      {
        name: "Total Present/Absent",
        path: "/attendance/status",
        pro: false,
      },
    ],
  },
  {
    icon: <LeaveIcon />,
    name: "Leave Management",
    subItems: [
      { name: "Apply Leave", path: "/leaves/apply", pro: false },
      { name: "Public Holidays", path: "/leaves/public-holidays", pro: false },
    ],
  },
  {
    icon: <GridIcon />,
    name: "WF Activity Management",
    subItems: [
      {  icon: <ClipboardList size={16} />,name: "Business Plan", path: "/business-plan", pro: false },

      {  icon: <FileText size={16} />,name: "Emp Daily Activities", path: "/emp-daily-activities", pro: false },
      { icon: <BarChart2 size={16} />,name: "Daily Activities Report", path: "/emp-daily-activities", pro: false },
      { icon: <Building2 size={16} />, name: "Dept Dashboard", path: "/emp-daily-activities", pro: false },
      { icon: <Globe size={16} />, name: "Org Dashboard", path: "/emp-daily-activities", pro: false },
    ],
  },
 

  //   {
  //     icon: <CalenderIcon />,
  //     name: "Calendar",
  //     path: "/calendar",
  //   },
  //   {
  //     icon: <UserCircleIcon />,
  //     name: "User Profile",
  //     path: "/profile",
  //   },
  //   {
  //     name: "Forms",
  //     icon: <ListIcon />,
  //     subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  //   },
  //   {
  //     name: "Tables",
  //     icon: <TableIcon />,
  //     subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  //   },
  //   {
  //     name: "Pages",
  //     icon: <PageIcon />,
  //     subItems: [
  //       { name: "Blank Page", path: "/blank", pro: false },
  //       { name: "404 Error", path: "/error-404", pro: false },
  //     ],
  //   },
];

const othersItems: NavItem[] = [
  //   {
  //     icon: <PieChartIcon />,
  //     name: "Charts",
  //     subItems: [
  //       { name: "Line Chart", path: "/line-chart", pro: false },
  //       { name: "Bar Chart", path: "/bar-chart", pro: false },
  //     ],
  //   },
  //   {
  //     icon: <BoxCubeIcon />,
  //     name: "UI Elements",
  //     subItems: [
  //       { name: "Alerts", path: "/alerts", pro: false },
  //       { name: "Avatar", path: "/avatars", pro: false },
  //       { name: "Badge", path: "/badge", pro: false },
  //       { name: "Buttons", path: "/buttons", pro: false },
  //       { name: "Images", path: "/images", pro: false },
  //       { name: "Videos", path: "/videos", pro: false },
  //     ],
  //   },
  //   {
  //     icon: <PlugInIcon />,
  //     name: "Authentication",
  //     subItems: [
  //       { name: "Sign In", path: "/signin", pro: false },
  //       { name: "Sign Up", path: "/signup", pro: false },
  //     ],
  //   },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const [transformedNavItems, setTransformedNavItems] =
    useState<NavItem[]>(navItems);
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const userRights = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    try {
      const response = await axios.get(`/assignrights/get/${user.user_id}/`);
      if (response.status !== 200) {
        throw new Error("Failed to fetch user rights");
      }
      const data = response.data;
    const transformed = _(data)
      .groupBy("mainmenu")
      .map((items, mainmenu) => {
        const icon =
        navItems.find((item) => item.name === mainmenu)?.icon ||
        <HorizontaLDots className="size-6" />;
        return {
        icon,
        name: mainmenu,
        subItems: items.map((item) => ({
          name: item.submenu,
          path: item.uri,
          pro: false,
          icon: icon,
        })),
        };
      })
      .value();

    // Ensure Dashboard is first if it exists
    const dashboardIndex = transformed.findIndex(
      (item) => item.name === "Dashboard"
    );
    if (dashboardIndex > 0) {
      const [dashboard] = transformed.splice(dashboardIndex, 1);
      transformed.unshift(dashboard);
    }

    setTransformedNavItems(transformed);
    //   console.log("User Rights Data:", transformed);
      // Process the user rights data as needed
    } catch (error) {
      console.error("Error fetching user rights:", error);
    }
  };
  useEffect(() => {
    userRights();
  }, []);
  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-center"
        }`}
      >
        <Link to="/dashboard">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/ismo_logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/ismo_logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/ismo_logo.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(transformedNavItems, "main")}
            </div>
            {/* <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div> */}
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;
