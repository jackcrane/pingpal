import React from "react";
import { DashboardPage } from "../components/DashboardPage";
import { H2, Loading } from "../kit";
import moment from "moment";
import { useAuth } from "../hooks/useAuth";

export const Index = () => {
  const { loading, user } = useAuth({});
  if (loading) return <Loading />;
  return (
    <DashboardPage title="Dashboard">
      <H2>
        Good{" "}
        {moment().hour() < 12
          ? "morning"
          : moment().hour() < 18
          ? "afternoon"
          : "evening"}
        , {user.name}
      </H2>
    </DashboardPage>
  );
};
