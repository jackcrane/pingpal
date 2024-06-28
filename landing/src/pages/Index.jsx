import React from "react";
import screenshot from "../../assets/screenshot.png";
import {
  Column,
  Container,
  GlowingLink,
  H1,
  H2,
  Link,
  P,
  Spacer,
} from "../kit";
import { BannerImage } from "./Index.style";
import useScrollPosition from "../hooks/useScrollPosition";
import { Header } from "../components/Header";
import { FeatureTable } from "../components/FeatureTable";

export const Index = () => {
  const [scrollPosition, scrollPct] = useScrollPosition();
  return (
    <Container>
      <Header />
      <Spacer height="100px" />
      <H1>Powering Perfection.</H1>
      <div>
        <GlowingLink to="/login">
          <P>Get started</P>
        </GlowingLink>
      </div>
      <Spacer height="100px" />
      <BannerImage
        src={screenshot}
        alt="screenshot"
        scrollPos={scrollPosition}
      />
      <Spacer height="50px" />
      <H2 id="features">Feature-rich; User-friendly</H2>
      <Spacer height="20px" />
      <FeatureTable />
      <Spacer height="300px" />
    </Container>
  );
};
