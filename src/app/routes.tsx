import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { ParagraphSelection } from "./pages/ParagraphSelection";
import { ReadingInterface } from "./pages/ReadingInterface";
import { ResultsScreen } from "./pages/ResultsScreen";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminGate } from "./pages/admin/AdminGate";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ParagraphManagement } from "./pages/admin/ParagraphManagement";
import { UserResults } from "./pages/admin/UserResults";
import { Analytics } from "./pages/admin/Analytics";
import { Assignments } from "./pages/admin/Assignments";
import { AdminSettings } from "./pages/admin/AdminSettings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/reading",
    Component: ReadingInterface,
  },
  {
    path: "/reading/select",
    Component: ParagraphSelection,
  },
  {
    path: "/results",
    Component: ResultsScreen,
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin",
    Component: AdminGate,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "paragraphs", Component: ParagraphManagement },
      { path: "assignments", Component: Assignments },
      { path: "users", Component: UserResults },
      { path: "analytics", Component: Analytics },
      { path: "settings", Component: AdminSettings },
    ],
  },
]);
