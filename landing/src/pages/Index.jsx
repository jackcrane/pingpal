import React from "react";
import screenshot from "../../assets/screenshot.png";
import { Container, H1, P, Spacer } from "../kit";
import { BannerImage } from "./Index.style";
import useScrollPosition from "../hooks/useScrollPosition";

export const Index = () => {
  const [scrollPosition, scrollPct] = useScrollPosition();
  return (
    <Container>
      <H1>Powering Perfection</H1>
      <P>{scrollPosition}</P>
      <Spacer height="100px" />
      <BannerImage
        src={screenshot}
        alt="screenshot"
        scrollPos={scrollPosition}
      />
    </Container>
  );
};
