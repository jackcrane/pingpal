import React, { useState } from "react";
import styled from "styled-components";
import { Between, Container, Link, P, Row, Spacer } from "./kit";
import useWorkspace from "./hooks/useWorkspace";
import logo from "./assets/logo-wordmark.svg";
import { FooterLinkIcon } from "./Footer";
import { List, X } from "@phosphor-icons/react";

const HeaderContainer = styled(Container)`
  padding: 0px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${(p) => p.theme.border};
  width: 100%;
`;

const NavLinks = styled(Row)`
  @media (max-width: 550px) {
    display: none;
  }
`;

const HamburgerMenu = styled.div`
  display: none;
  @media (max-width: 550px) {
    display: block;
    cursor: pointer;
  }
`;

const PopupMenu = styled.div`
  display: ${(props) => (props.open ? "flex" : "none")};
  position: fixed;
  flex-direction: column;
  justify-content: flex-end;
  top: 0;
  left: 0;
  width: 60%;
  height: 100vh;
  background: ${(p) => p.theme.bg};
  z-index: 1000;
  padding: 20px;
  box-shadow: 0px 0px 0 10000px rgba(0, 0, 0, 0.75);
`;

export const Header = () => {
  const { workspace, loading } = useWorkspace(window.workspaceId);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return null;

  return (
    <HeaderContainer>
      <Between>
        <NavLinks style={{ gap: 10 }} menuOpen={menuOpen}>
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
        </NavLinks>
        <HamburgerMenu onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </HamburgerMenu>
        {/* <Link to="https://pingpal.online">
          <Row style={{ gap: 5 }}>
            <P>Powered by</P>
            <img src={logo} style={{ height: 18 }} />
          </Row>
        </Link> */}
      </Between>
      <PopupMenu open={menuOpen}>
        <Row
          style={{ gap: 10, flexDirection: "column", alignItems: "flex-start" }}
        >
          <Link to="/" onClick={() => setMenuOpen(false)}>
            {workspace.name}
          </Link>
          {workspace.headerLink?.id && (
            <Link
              to={workspace.headerLink.url}
              onClick={() => setMenuOpen(false)}
            >
              <div style={{ display: "inline-flex", alignItems: "center" }}>
                <FooterLinkIcon icon={workspace.headerLink.icon} />
                <P>{workspace.headerLink.text}</P>
              </div>
            </Link>
          )}
          <Link to="https://pingpal.online" onClick={() => setMenuOpen(false)}>
            <Row style={{ gap: 5 }}>
              <P>Powered by</P>
              <img src={logo} style={{ height: 18 }} />
            </Row>
          </Link>
        </Row>
        <Spacer height="20px" />
        <HamburgerMenu onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </HamburgerMenu>
        <Spacer height="100px" />
      </PopupMenu>
    </HeaderContainer>
  );
};
