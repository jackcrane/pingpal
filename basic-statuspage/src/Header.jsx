import React from "react";
import styled from "styled-components";
import { Between, Container, Link, P, Row } from "./kit";
import useWorkspace from "./hooks/useWorkspace";
import logo from "./assets/logo-wordmark.svg";
import { FooterLinkIcon } from "./Footer";

const HeaderContainer = styled(Container)`
  padding: 0px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${(p) => p.theme.border};
  width: 100%;
`;

export const Header = () => {
  const { workspace, loading } = useWorkspace(window.workspaceId);

  if (loading) return null;

  return (
    <HeaderContainer style={{}}>
      <Between>
        <Row style={{ gap: 10 }}>
          <Link to="/">{workspace.name}</Link>
          {workspace.headerLink?.id ? (
            <Link to={workspace.headerLink.url}>
              <div style={{ display: "inline-flex", alignItems: "center" }}>
                <FooterLinkIcon icon={workspace.headerLink.icon} />
                <P>{workspace.headerLink.text}</P>
              </div>
            </Link>
          ) : (
            <></>
          )}
        </Row>
        <Link to="https://pingpal.online">
          <Row style={{ gap: 5 }}>
            <P>Powered by</P>
            <img src={logo} style={{ height: 18 }} />
          </Row>
        </Link>
      </Between>
    </HeaderContainer>
  );
};
