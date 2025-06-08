import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../Components/Navbar";

const Layout = () => {
  const location = useLocation();


  const noNavbarRoutes = ["/", "/signup", "/onboarding"];
  const shouldShowNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      {shouldShowNavbar && <Navbar />}
      <main className=""> {}
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
