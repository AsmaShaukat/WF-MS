import { Outlet,Navigate } from "react-router-dom";


const ProtectedRoute = () => {
  const token=localStorage.getItem("token");


  // Render the child components if user is authenticated
  return token?<Outlet />:<Navigate to="/" replace />;
}

export default ProtectedRoute;