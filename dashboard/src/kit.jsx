import styled, { keyframes, useTheme } from "styled-components";
import React, { useState } from "react";
import { CircleNotch, Spinner } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import Color from "color";

export const Hr = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.border};
  margin: 10px 0px;
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

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  font-family: "Manrope", sans-serif;
  background-color: ${(props) => props.theme.bg};
  color: ${(props) => props.theme.subtext};
  max-width: 1300px;
  margin: auto;
`;

export const H1 = styled.h1`
  font-size: 6rem;
  @media screen and (max-width: 900px) {
    font-size: 4rem;
  }
  margin: 0;
  letter-spacing: -5px;
  color: ${(props) => props.theme.text};
`;

export const H2 = styled.h2`
  font-size: 2rem;
  margin: 0;
  letter-spacing: -1px;
  color: ${(props) => props.theme.text};
`;

export const H3 = styled.h3`
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: -0.75px;
  color: ${(props) => props.theme.text};
`;

export const H4 = styled.h4`
  font-size: 1.25rem;
  margin: 0;
  color: ${(props) => props.theme.text};
`;

export const P = styled.p`
  margin: 0;
`;

export const U = styled.u`
  text-decoration-color: ${(props) => props.theme.subtext};
  color: ${(props) => props.theme.subtext};
`;

export const Spacer = styled.div`
  height: ${(props) => props.height || "20px"};
`;

export const ServiceContainer = styled.div`
  gap: 16px;
`;

export const Between = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: ${(props) => (props.at ? "flex-start" : "center")};
`;

export const Row = styled.div`
  display: flex;
  gap: 2px;
  align-items: center;
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.gap || "0px"};
`;

export const Relative = styled.div`
  position: relative;
`;

export const Loading = () => {
  const duckFacts = [
    "Ducks have waterproof feathers due to a special gland that produces oil.",
    "A group of ducks is called a 'raft', 'team', or 'paddling'.",
    "Ducks can sleep with one eye open to stay alert for predators.",
    "Ducks have webbed feet which act like paddles, making them great swimmers.",
    "The quack of a duck doesn't echo, and no one knows why.",
    "Ducks can fly as fast as 60 miles per hour.",
    "Some ducks migrate thousands of miles between their breeding and wintering grounds.",
    "Male ducks are called 'drakes', female ducks are called 'hens', and baby ducks are called 'ducklings'.",
    "Ducks have a unique way of walking called 'waddling' due to their webbed feet.",
    "Ducks can see in color and have three eyelids.",
  ];

  return (
    <_LoadingContainer>
      <_LoadingH2>Loading...</_LoadingH2>
      <Spacer />
      <_LoadingIcon size={48} />
      <Spacer />
      <Spacer />
      <_LoadingH4>In the meantime, enjoy a random duck fact!</_LoadingH4>
      <Spacer />
      <P>{duckFacts[Math.floor(Math.random() * duckFacts.length)]}</P>
    </_LoadingContainer>
  );
};

const _LoadingH2 = styled(H2)`
  color: ${(props) => props.theme.subtext};
`;

const _LoadingH4 = styled(H4)`
  color: ${(props) => props.theme.subtext};
`;

const _LoadingContainer = styled(Container)`
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 70vh;
  width: 80%;
  margin: auto;
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const _LoadingIcon = styled(CircleNotch)`
  animation: ${rotate} 2s linear infinite;
`;

const _Link = styled(Link)`
  text-decoration: none;
  color: ${({ theme }) => theme.text};
  padding: 5px;
  border-radius: 5px;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  background-color: ${({ theme }) => Color(theme.border).alpha(0.2).string()};
  border: 1px solid ${({ theme }) => theme.border};
  &:hover {
    background-color: ${({ theme }) => Color(theme.border).alpha(0.4).string()};
  }
  transition: background-color 0.2s;
`;

export { _Link as Link };

export const TextLink = styled(Link)`
  text-decoration: underline;
  color: ${(props) =>
    props.orange ? props.theme.badnews : props.theme.subtext};
  text-decoration-color: ${(props) =>
    props.orange ? props.theme.badnews : props.theme.subtext};
  &:hover {
    color: ${(props) => props.theme.text};
  }
`;

export const TextInput = styled.input`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.border};
  background-color: ${(props) => props.theme.bg};
  color: ${(props) => props.theme.text};
  font-size: 1rem;
  &:focus {
    outline: none;
    border: 1px solid ${(props) => props.theme.blue};
  }
`;

export const MicroTextInput = styled(TextInput)`
  padding: 2px 5px;
  font-size: 0.9rem;
`;

export const ActionButton = styled.button`
  padding: 10px;
  border-radius: 5px;
  background-color: ${(props) =>
    props.disabled
      ? props.theme.border
      : Color(props.theme.blue).alpha(0.2).toString()};
  color: ${(props) => props.theme.subtext};
  transition: background-color 0.2s;
  border: 1px solid
    ${(props) => (props.disabled ? props.theme.border : props.theme.blue)};
  font-size: 1rem;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  &:hover {
    background-color: ${(props) =>
      props.disabled
        ? props.theme.border
        : Color(props.theme.blue).alpha(0.4).toString()};
  }
`;

export const ActionLink = styled(_Link)`
  background-color: ${(props) => Color(props.theme.blue).alpha(0.2).string()};
  border: 1px solid ${(props) => props.theme.blue};
  &:hover {
    background-color: ${(props) => Color(props.theme.blue).alpha(0.4).string()};
  }
`;

export const Red = styled.span`
  color: ${(props) => props.theme.danger};
`;

export const Orange = styled.span`
  color: ${(props) => (props.invert ? props.theme.bg : props.theme.badnews)};
  transition: 0.2s;
  border-radius: 5px;
  background-color: ${(props) =>
    props.invert ? props.theme.badnews : props.theme.bg};
  padding: ${(props) => (props.invert ? "0px 15px" : "0px")};
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

const _SegmentedControl = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};
`;

const _SegmentedControlButton = styled.button`
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  background-color: ${({ theme, selected }) =>
    selected ? Color(theme.blue).alpha(0.2).toString() : theme.bg};
  border: ${({ selected, theme }) =>
    selected ? `1px solid ${theme.blue}` : `1px solid ${theme.bg}`};
  color: ${({ theme }) => theme.text};
  transition: background-color 0.2s;
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.hover};
  }
`;

export const SegmentedController = ({
  segments,
  onSegmentChange,
  activeSegment,
  disabled,
}) => {
  const [activeIndex, setActiveIndex] = useState(activeSegment);

  const handleSegmentClick = (index) => {
    if (disabled) return;
    setActiveIndex(index);
    if (onSegmentChange) {
      onSegmentChange(index);
    }
  };

  return (
    <_SegmentedControl disabled={disabled}>
      {segments.map((segment, index) => (
        <_SegmentedControlButton
          key={index}
          selected={index === activeIndex}
          onClick={() => handleSegmentClick(index)}
        >
          {segment}
        </_SegmentedControlButton>
      ))}
    </_SegmentedControl>
  );
};
