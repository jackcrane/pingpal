import React from "react";
import { Column, Link } from "../kit";
import Styled from "styled-components";

const SidenavContainer = Styled(Column)`
  width: 200px;
  gap: 10px;
`;

export const Sidenav = () => {
  return (
    <SidenavContainer>
      <Link to="/">Dashboard</Link>
      <Link to="/outages">Outages</Link>
      <Link to="/workspace">Workspaces</Link>
      <Link to="/account">Account</Link>
    </SidenavContainer>
  );
};
