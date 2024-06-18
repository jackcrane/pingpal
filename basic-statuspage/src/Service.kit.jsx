import styled from "styled-components";
import React from "react";

const colors = [
  "#ffadad",
  "#ffd6a5",
  "#fdffb6",
  "#caffbf",
  "#9bf6ff",
  "#a0c4ff",
  "#bdb2ff",
  "#ffc6ff",
];
const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

export const Container = ({ id, children }) => (
  <Link href={`#${id}`}>
    <_Container id={id}>{children}</_Container>
  </Link>
);

const Link = styled.a`
  text-decoration: none;
  color: inherit;
`;

const _Container = styled.div`
  transition: background-color 0.2s;
  &:hover {
    background-color: ${({ theme }) => theme.hover};
  }
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  box-sizing: border-box;
  position: relative;
  min-height: 200px;
  overflow: hidden;
  width: calc(25% - 20px);
  display: inline-block;
  margin: 10px;
  @media screen and (max-width: 1500px) {
    width: calc(33.33% - 20px);
  }
  @media screen and (max-width: 1000px) {
    width: calc(50% - 20px);
  }
  @media screen and (max-width: 700px) {
    width: calc(100% - 20px);
  }
`;

const BlurBlob = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 50px;
  height: 50px;
  background: ${({ color }) => color};
  z-index: -1;
  filter: blur(50px);
`;

export const TitleSkeleton = styled.div`
  width: 100%;
  height: 20px;
  background: ${({ theme }) => theme.border};
  border-radius: 25px;
`;

export const Title = styled.h2`
  height: 20px;
`;

export const Subtitle = styled.h3`
  height: 15px;
`;

export const PillRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
`;

// Map values from [0, 100] to [10, 30]
const mapUptimeToSize = (uptime) => (uptime / 100) * 20 + 3;

export const StatusPill = styled.div`
  height: ${(props) => mapUptimeToSize(props.uptime)}px;
  width: 2px;
  border-radius: 15px;
  background: ${(props) =>
    props.uptime > 97
      ? props.theme.success
      : props.uptime > 70
      ? props.theme.warning
      : props.uptime > 10
      ? props.theme.badnews
      : props.theme.danger};
`;
