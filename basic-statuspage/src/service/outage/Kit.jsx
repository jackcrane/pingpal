import moment from "moment";
import styled, { useTheme } from "styled-components";
import React from "react";
import { P } from "../../kit";
import Color from "color";

export const Card = styled.div`
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.border};
`;

export const Hr = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.border};
  margin: 10px -10px;
`;

export const OutageDetailsContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-direction: row;
  transition: transform 0.2s;
  height: ${(props) => (props.open ? "auto" : "0")};
  overflow: ${(props) => (props.open ? "visible" : "hidden")};
  @media screen and (max-width: 1000px) {
    flex-direction: column;
  }
`;

export const OutageDetail = styled.div`
  display: flex;
  flex-direction: column;
  width: 50%;
  @media screen and (max-width: 1000px) {
    width: 100%;
  }
`;

export const Duration = ({ start, end }) => {
  const humanTime = moment(start).from(moment(end), true);
  const diff = moment(start).diff(moment(end));
  const duration = moment.duration(diff);
  const secondCount = moment(start).diff(moment(end), "seconds");
  const theme = useTheme();

  console.log(duration);

  const days = duration.days() > 0 ? `${duration.days()}d ` : "";
  const hours = duration.hours() > 0 ? `${duration.hours()}h ` : "";
  const minutes = duration.minutes() > 0 ? `${duration.minutes()}m ` : "";
  const seconds = duration.seconds() > 0 ? `${duration.seconds()}s` : "";

  // 0: success, (0, 60): warning, 60+: danger
  const color =
    diff === 0
      ? theme.success
      : secondCount < 60
      ? theme.warning
      : theme.danger;

  return (
    <P
      style={{
        color,
      }}
    >
      {days}
      {hours}
      {minutes}
      {seconds}
    </P>
  );
};

export const HrHiddenLarge = styled(Hr)`
  display: none;
  @media screen and (max-width: 1000px) {
    display: initial;
  }
`;

const _TooltipBase = styled(P)`
  text-decoration: none;
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted ${({ theme }) => theme.subtext};
  cursor: help;
  &:hover > span {
    visibility: visible;
  }
  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

const _TooltipText = styled.span`
  visibility: hidden;
  width: 200px;
  background-color: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.subtext};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px;
  @media screen and (max-width: 1000px) {
    transform: translateX(-90%);
  }
`;

export const Tooltip = ({ text, message }) => {
  return (
    <_TooltipBase>
      {text}
      <_TooltipText>{message}</_TooltipText>
    </_TooltipBase>
  );
};

export const H5 = styled.h5`
  font-size: 1rem;
  margin: 0;
  color: ${({ theme }) => theme.text};
`;

export const CommentCard = styled(Card)`
  border-color: ${({ theme }) => theme.blue};
  border-left-width: 5px;
  background-color: ${({ theme }) => Color(theme.blue).alpha(0.1).string()};
`;

export const DropdownButton = styled.button`
  height: 30px;
  width: 30px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.hover};
  border: 1px solid ${({ theme }) => theme.border};
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: rotate(${(props) => (props.open ? "90deg" : "0deg")});
  transition: opacity 0.2s, transform 0.2s, rotate 0.2s;
  &:hover {
    rotate: ${(props) => (props.open ? "-20deg" : "20deg")};
  }
`;
