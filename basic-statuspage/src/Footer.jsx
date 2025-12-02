import React from "react";
import styled from "styled-components";
import {
  Between,
  Column,
  Container,
  Link,
  P,
  Row,
  Spacer,
  TextLink,
} from "./kit";
import useWorkspace from "./hooks/useWorkspace";
import logo from "./assets/logo-wordmark.svg";
import moment from "moment";
import {
  Books,
  CreditCard,
  CurrencyBtc,
  CurrencyEth,
  DiscordLogo,
  DribbbleLogo,
  FacebookLogo,
  GithubLogo,
  InstagramLogo,
  LinkSimple,
  LinkedinLogo,
  PaperPlaneTilt,
  Phone,
  SlackLogo,
  TwitterLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";

const FooterContainer = styled(Container)`
  padding: 0px;
  padding-bottom: 40px;
  padding-top: 20px;
  border-top: 1px solid ${(p) => p.theme.border};
  width: 100%;
`;

const FooterRow = styled(Row)`
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  @media screen and (max-width: 500px) {
    flex-direction: column;
  }
`;

const FooterColumn = styled(Column)`
  gap: 5px;
  min-width: 200px;
  @media screen and (max-width: 700px) {
    width: 50%;
  }
`;

// GITHUB
//   TWITTER
//   LINKEDIN
//   INSTAGRAM
//   FACEBOOK
//   YOUTUBE
//   DISCORD
//   SLACK
//   PHONE
//   EMAIL
//   WEBSITE
//   BLOG
//   PAYMENT
//   BTC
//   ETH
//   DRIBBBLE

export const FooterLinkIcon = ({ icon }) => {
  switch (icon) {
    case "GITHUB":
      return <GithubLogo />;
    case "TWITTER":
      return <TwitterLogo />;
    case "LINKEDIN":
      return <LinkedinLogo />;
    case "INSTAGRAM":
      return <InstagramLogo />;
    case "FACEBOOK":
      return <FacebookLogo />;
    case "YOUTUBE":
      return <YoutubeLogo />;
    case "DISCORD":
      return <DiscordLogo />;
    case "SLACK":
      return <SlackLogo />;
    case "PHONE":
      return <Phone />;
    case "EMAIL":
      return <PaperPlaneTilt />;
    case "WEBSITE":
      return <LinkSimple />;
    case "BLOG":
      return <Books />;
    case "PAYMENT":
      return <CreditCard />;
    case "BTC":
      return <CurrencyBtc />;
    case "ETH":
      return <CurrencyEth />;
    case "DRIBBBLE":
      return <DribbbleLogo />;
    default:
      return null;
  }
};

export const Footer = () => {
  const { workspace, loading } = useWorkspace(window.workspaceId);

  if (loading) return null;

  return (
    <FooterContainer style={{}}>
      <FooterRow>
        <FooterColumn>
          <P>{workspace.name}</P>
          {workspace?.footerLinks?.map((link) => (
            <TextLink to={link.url}>
              <div
                style={{ display: "inline-block", textDecoration: "underline" }}
              >
                <Row style={{ gap: 5 }}>
                  <FooterLinkIcon icon={link.icon} />
                  <P>{link.text}</P>
                </Row>
              </div>
            </TextLink>
          ))}
        </FooterColumn>
      </FooterRow>
      <Spacer height="20px" />
      <P style={{ textAlign: "center" }}>
        Copyright © {new Date().getFullYear()} {workspace.name} and PingPal
      </P>
    </FooterContainer>
  );
};
