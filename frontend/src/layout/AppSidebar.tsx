import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import axios from "../api/axios";
import _ from "lodash";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
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

const ADMIN_GRADES = [9, 10, 11];

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
      { name: "Individual Attendance", path: "/attendance/individual", pro: false },
      { name: "Total Present/Absent", path: "/attendance/status", pro: false },
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
      { name: "Emp Daily Activities", path: "/emp-daily-activities", pro: false },
      { name: "Daily Activities Report", path: "/activities-report", pro: false },
      { name: "Business Plan", path: "/business-plan", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const [transformedNavItems, setTransformedNavItems] = useState<NavItem[]>(navItems);
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? transformedNavItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });
    if (!submenuMatched) setOpenSubmenu(null);
  }, [location, isActive, transformedNavItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) return null;
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
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size ${openSubmenu?.type === menuType && openSubmenu?.index === index
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
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType && openSubmenu?.index === index
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
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
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
                  <li key={subItem.path}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
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
    const gradeId = user?.grade_id ?? 0;
    const isSuperuser = user?.is_superuser ?? false;
    const isAdmin = ADMIN_GRADES.includes(gradeId) || isSuperuser;
    const hasOrgAccess = [10, 11].includes(gradeId) || isSuperuser;

    try {
      const response = await axios.get(`/assignrights/get/${user.user_id}/`);
      const data = response.data;

      const transformed = _(data)
        .groupBy("mainmenu")
        .map((items, mainmenu) => {
          const icon =
            navItems.find((item) => item.name === mainmenu)?.icon || <GridIcon />;
          return {
            icon,
            name: mainmenu,
            subItems: items.map((item: any) => ({
              name: item.submenu,
              path: item.uri,
              pro: false,
            })),
          };
        })
        .value();

      // Dashboard hamesha pehle
      const dashIdx = transformed.findIndex((item) => item.name === "Dashboard");
      if (dashIdx > 0) {
        const [dash] = transformed.splice(dashIdx, 1);
        transformed.unshift(dash);
      }

      // WF Activity Management handle karo
      const wfItem = transformed.find((item) => item.name === "WF Activity Management");

      if (wfItem && wfItem.subItems) {

        const seen = new Set<string>();
        wfItem.subItems = wfItem.subItems.filter((s) => {
          if (seen.has(s.path)) return false;
          seen.add(s.path);
          return true;
        });

        // Step 2: Required links
        const requiredLinks = [
          { name: "Emp Daily Activities", path: "/emp-daily-activities" },
          { name: "Daily Activities Report", path: "/activities-report" },
          { name: "Business Plan", path: "/business-plan" },
        ];
        requiredLinks.forEach((link) => {
          if (!wfItem.subItems!.find((s) => s.path === link.path)) {
            wfItem.subItems!.push({ ...link, pro: false });
          }
        });

        // Step 3: Dept Dashboard — grade 9/10/11 + superuser
        if (isAdmin) {
          if (!wfItem.subItems.find((s) => s.path === "/dept-dashboard")) {
            wfItem.subItems.push({
              name: "Department Dashboard",
              path: "/dept-dashboard",
              pro: false,
            });
          }
        } else {
          // Grade 9 se neecha — Dept Dashboard hata do
          wfItem.subItems = wfItem.subItems.filter(
            (s) => s.path !== "/dept-dashboard"
          );
        }

        // Step 4: Org Dashboard — sirf grade 10/11 + superuser
        if (hasOrgAccess) {
          if (!wfItem.subItems.find((s) => s.path === "/org-dashboard")) {
            wfItem.subItems.push({
              name: "Organization Dashboard",
              path: "/org-dashboard",
              pro: false,
            });
          }
        } else {
          // Grade 10 se neecha — Org Dashboard hata do
          wfItem.subItems = wfItem.subItems.filter(
            (s) => s.path !== "/org-dashboard"
          );
        }

      } else if (!wfItem) {
        // WF item database mein nahi tha — manually banao
        const wfSubItems: any[] = [
          { name: "Emp Daily Activities", path: "/emp-daily-activities", pro: false },
          { name: "Daily Activities Report", path: "/activities-report", pro: false },
          { name: "Business Plan", path: "/business-plan", pro: false },
        ];
        if (isAdmin) {
          wfSubItems.push({
            name: "Department Dashboard",
            path: "/dept-dashboard",
            pro: false,
          });
        }
        if (hasOrgAccess) {
          wfSubItems.push({
            name: "Organization Dashboard",
            path: "/org-dashboard",
            pro: false,
          });
        }
        transformed.push({
          icon: <GridIcon />,
          name: "WF Activity Management",
          subItems: wfSubItems,
        });
      }

      setTransformedNavItems(transformed);

    } catch (error) {
      console.error("Error fetching user rights:", error);
      // API fail ho to navItems fallback + grade check
      const fallback = navItems.map((item) => {
        if (item.name === "WF Activity Management") {
          const extra: any[] = [];
          if (isAdmin) {
            extra.push({
              name: "Department Dashboard",
              path: "/dept-dashboard",
              pro: false,
            });
          }
          if (hasOrgAccess) {
            extra.push({
              name: "Organization Dashboard",
              path: "/org-dashboard",
              pro: false,
            });
          }
          return {
            ...item,
            subItems: [...(item.subItems || []), ...extra],
          };
        }
        return item;
      });
      setTransformedNavItems(fallback);
    }
  };

  useEffect(() => {
    userRights();
  }, []);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-center"
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
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
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
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;