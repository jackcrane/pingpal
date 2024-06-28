import React from "react";
import styled from "styled-components";
import { Between, Kbd, Row } from "../kit";
import Color from "color";

const _BannerImageContainer = styled.div`
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
  overflow: hidden;
  height: 75vh;
  position: relative;
`;

const _BannerImage = styled.img`
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(
    -${({ scrollPos }) => (scrollPos > 0 ? scrollPos / 5 : 0)}%
  );
  z-index: 0;
`;

const _BannerBrowserMenuBar = styled.div`
  padding: 10px;
  background-color: ${({ theme }) => theme.bg};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  z-index: 1;
  position: relative;
`;

const _BannerBrowserMenuBarButton = styled.button`
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid
    ${(props) =>
      props.color === "red"
        ? props.theme.danger
        : props.color === "yellow"
        ? props.theme.warning
        : props.theme.success};
  background-color: ${(props) =>
    props.color === "red"
      ? Color(props.theme.danger).alpha(0.5).string()
      : props.color === "yellow"
      ? Color(props.theme.warning).alpha(0.5).string()
      : Color(props.theme.success).alpha(0.5).string()};
`;

export const BannerImage = (props) => {
  return (
    <_BannerImageContainer>
      <_BannerBrowserMenuBar>
        <Between>
          <Row>
            <_BannerBrowserMenuBarButton color="red" />
            <_BannerBrowserMenuBarButton color="yellow" />
            <_BannerBrowserMenuBarButton color="green" />
          </Row>
          <Kbd>https://us.pingpal.online</Kbd>
        </Between>
      </_BannerBrowserMenuBar>
      <_BannerImage {...props} />
    </_BannerImageContainer>
  );
};
