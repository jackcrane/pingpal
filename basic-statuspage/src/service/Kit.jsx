import styled, { useTheme } from "styled-components";
import React from "react";
import { Link } from "react-router-dom";
import { ArrowCircleDown, ArrowCircleUp } from "@phosphor-icons/react";
import { Column } from "../kit";
import Color from "color";

export const Container = ({ id, children, fullscreen }) =>
  fullscreen ? (
    <_FullscreenContainer id={id}>{children}</_FullscreenContainer>
  ) : (
    <_Link to={`${id}`}>
      <_Container id={id}>{children}</_Container>
    </_Link>
  );

const _Link = styled(Link)`
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
    width: calc(100%);
    margin: 10px 0;
  }
`;

const _FullscreenContainer = styled.div`
  box-sizing: border-box;
  position: relative;
  min-height: 600px;
  overflow: hidden;
  width: 100%;
  display: inline-block;
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
const mapUptimeToSize = (uptime, fullscreen) =>
  fullscreen ? (uptime / 100) * 50 + 3 : (uptime / 100) * 20 + 3;

const _StatusPillContainer = styled.div`
  position: relative;
  opacity: ${(props) => (props.isFiller ? 0 : 1)};
`;

const _StatusPill = styled.div`
  height: ${(props) => mapUptimeToSize(props.uptime, props.fullscreen)}px;
  /* width: 2px; */
  width: ${(props) => (props.fullscreen ? "8px" : "2px")};
  @media screen and (max-width: 1300px) {
    width: ${(props) => (props.fullscreen ? "6px" : "2px")};
  }
  @media screen and (max-width: 1100px) {
    width: ${(props) => (props.fullscreen ? "4px" : "2px")};
  }
  @media screen and (max-width: 600px) {
    width: ${(props) => (props.fullscreen ? "3px" : "2px")};
  }
  @media screen and (max-width: 500px) {
    width: 2px;
  }
  border-radius: 15px;
  background: ${(props) =>
    props.uptime == 100
      ? props.theme.success
      : props.uptime > 70
      ? props.theme.warning
      : props.uptime > 10
      ? props.theme.badnews
      : props.theme.danger};
`;

const _StatusPillLabel = styled.div`
  position: absolute;
  bottom: -67px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.8rem;
  transform: rotate(270deg)
    translateY(
      ${(props) =>
        props.cheatLeft ? "10px" : props.cheatRight ? "-10px" : "0"}
    );
  color: ${({ theme }) => theme.subtext};
  white-space: nowrap;
  background-color: ${({ theme }) => theme.bg};
  z-index: 1;
`;

const _StatusPillLabelText = styled.span`
  border: 1px solid ${({ theme }) => theme.border};
  width: 45px;
  display: block;
`;

const _StatusPillLine = styled.div`
  height: 1px;
  width: 20px;
  background: ${({ theme }) => theme.border};
  margin: 0;
  position: absolute;
  transform: rotate(90deg) translateX(5px) translateY(6px);
  @media screen and (max-width: 1300px) {
    transform: rotate(90deg) translateX(5px) translateY(7px);
  }
  @media screen and (max-width: 1100px) {
    transform: rotate(90deg) translateX(5px) translateY(8px);
  }
  @media screen and (max-width: 600px) {
    transform: rotate(90deg) translateX(5px) translateY(9px);
  }
`;

export const StatusPill = (props) => {
  return (
    <_StatusPillContainer isFiller={props.isFiller}>
      <_StatusPill {...props} />
      {props.fullscreen && props.showLabel && (
        <>
          <_StatusPillLine />
          <_StatusPillLabel
            cheatLeft={props.bucketNumber == 1}
            cheatRight={props.bucketNumber == 100}
          >
            <_StatusPillLabelText>{props.labelText}</_StatusPillLabelText>
          </_StatusPillLabel>
        </>
      )}
    </_StatusPillContainer>
  );
};

export const PillHoverHost = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100000000px;
  background: ${({ hovered, theme }) =>
    hovered ? Color(theme.text).alpha(0.08).string() : "transparent"};
  border-width: 1px;
  border-style: solid;
  border-bottom: none;
  border-color: ${({ hovered, theme }) =>
    hovered ? Color(theme.text).alpha(0.15).string() : "transparent"};
  /* transition: background 0.2s, border-color 0.2s; */
`;

export const NoOverflow = styled.div`
  overflow: hidden;
`;

export const Red = styled.span`
  color: ${({ theme }) => theme.danger};
`;

export const Green = styled.span`
  color: ${({ theme }) => theme.success};
`;

export const Blue = styled.span`
  color: ${({ theme }) => theme.blue};
`;

export const Yellow = styled.span`
  color: ${({ theme }) => theme.warning};
`;

export const Orange = styled.span`
  color: ${({ theme }) => theme.badnews};
`;

export const ValueBlock = styled.div`
  display: inline-block;
  width: 80px;
  text-align: right;
`;

export const UpTrend = () => {
  const theme = useTheme();
  return <ArrowCircleUp color={theme.danger} size={16} />;
};

export const DownTrend = () => {
  const theme = useTheme();
  return <ArrowCircleDown color={theme.success} size={16} />;
};

export const S = styled.span`
  font-size: 0.8rem;
`;

export const BackToWorkspace = styled(Link)`
  text-decoration: none;
  color: ${({ theme }) => theme.text};
  padding: 5px;
  border-radius: 5px;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  background-color: ${({ theme }) => theme.hover};
  border: 1px solid ${({ theme }) => theme.border};
  opacity: 0.8;
  &:hover {
    opacity: 1;
  }
  transition: opacity 0.2s;
`;

export const FailureLink = styled(Link)`
  text-decoration-color: inherit;
  font-size: 1rem;
  color: ${({ theme }) => theme.subtext};
  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

export const Ul = styled.ul`
  padding: 0;
  padding-left: 1rem;
  margin: 0;
`;

export const Li = styled.li``;

export const ServicePageContainer = styled.div`
  display: flex;
  flex-direction: row;
  @media screen and (max-width: 900px) {
    flex-direction: column;
  }
`;

export const GraphsContainer = styled(Column)`
  width: ${(props) => (props.fullscreen ? "70%" : "100%")};
  @media screen and (max-width: 900px) {
    width: 100%;
    margin-bottom: 20px;
  }
  margin-bottom: ${(props) => (props.fullscreen ? "200px" : "0")};
`;

export const InspectorContainer = styled.div`
  width: 30%;
  @media screen and (max-width: 900px) {
    width: 100%;
    padding-right: 10px;
    padding-left: 0px;
  }
  padding-right: 2px;
  padding-left: 10px;

  height: 100%;
  overflow-y: auto;
`;

export const BucketSelectorButton = styled.button`
  height: 32px;
  width: 32px;
  background-color: ${({ theme }) => theme.hover};
  border: 1px solid ${({ theme }) => theme.border};
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  border-radius: 5px;
  &:hover {
    opacity: 1;
    transform: translateX(${(props) => (props.left ? "-2px" : "2px")});
  }
`;

export const Kbd = styled.kbd`
  background-color: ${({ theme }) => theme.hover};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;
  padding: 2px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Card = styled.div`
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 10px;
`;

export const OutageCard = styled(Card)`
  background-color: ${({ theme }) => Color(theme.danger).alpha(0.1).string()};
  border: 1px solid ${({ theme }) => theme.danger};
`;

export const WorkingCard = styled(Card)`
  background-color: ${({ theme }) => Color(theme.success).alpha(0.1).string()};
  border: 1px solid ${({ theme }) => theme.success};
`;

export const EmptyOutageCard = styled(Card)`
  background-color: ${({ theme }) => Color(theme.border).alpha(0.2).string()};
  border: 1px dashed ${({ theme }) => theme.border};
`;
