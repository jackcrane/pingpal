import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  font-family: "Manrope", sans-serif;
  background-color: ${(props) => props.theme.bg};
  color: ${(props) => props.theme.text};
`;

export const H1 = styled.h1`
  margin-bottom: 50px;
  font-size: 6rem;
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
`;
