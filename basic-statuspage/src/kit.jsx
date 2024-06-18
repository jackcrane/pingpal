import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  font-family: "Manrope", sans-serif;
  background-color: ${(props) => props.theme.bg};
  color: ${(props) => props.theme.subtext};
`;

export const H1 = styled.h1`
  font-size: 6rem;
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
