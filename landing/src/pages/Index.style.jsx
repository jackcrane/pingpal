import React from "react";
import styled from "styled-components";
import { Between, Kbd, Row } from "../kit";
import Color from "color";

const clamp = (min, max, value) => Math.min(Math.max(value, min), max);

const _BannerImageContainer = styled.div`
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
  overflow: hidden;
  position: relative;
  opacity: 0.5;
  filter: sepia(0.5);
  transition: opacity 0.5s, filter 0.5s;
  &:hover {
    opacity: 1;
    filter: none;
  }
`;

const _BannerImage = styled.img`
  width: 100%;
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
