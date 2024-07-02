import React from "react";
import { Container, H1, H2, Loading, Row } from "../kit";
import { useAuth } from "../hooks/useAuth";
import { Header } from "../components/Header";
import moment from "moment";
import { Sidenav } from "./Sidenav";

export const DashboardPage = ({ title, children }) => {
  const { loading, user, logout } = useAuth({});

  if (loading) return <Loading />;
  return (
    <Container>
      <Header user={user} logout={logout} />

      <Row style={{ gap: 10, alignItems: "flex-start", marginTop: 10 }}>
        <Sidenav />
        <div style={{ width: "100%" }}>{children}</div>
      </Row>
    </Container>
  );
};
