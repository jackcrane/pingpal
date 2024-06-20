import styled, { keyframes, useTheme } from "styled-components";
import React from "react";
import { CircleNotch, Spinner } from "@phosphor-icons/react";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  font-family: "Manrope", sans-serif;
  background-color: ${(props) => props.theme.bg};
  color: ${(props) => props.theme.subtext};
  max-width: 1500px;
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

export const Spacer = styled.div`
  height: ${(props) => props.height || "20px"};
`;

export const ServiceContainer = styled.div`
  gap: 16px;
`;

export const Between = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  height: 100vh;
  width: 100%;
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const _LoadingIcon = styled(CircleNotch)`
  animation: ${rotate} 2s linear infinite;
`;
