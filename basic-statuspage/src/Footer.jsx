import React, { useContext, useState } from "react";
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
import { ThemePreferenceContext } from "./theme";
import { url } from "./lib/url";
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

const ThemeSelect = styled.select`
  font-size: 0.85rem;
  padding: 4px 28px 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background-color: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  appearance: none;
  background-image: linear-gradient(
      45deg,
      transparent 50%,
      ${({ theme }) => theme.text} 50%
    ),
    linear-gradient(135deg, ${({ theme }) => theme.text} 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% - 2px),
    calc(100% - 10px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  transition: background-color 0.2s, border-color 0.2s;
  &:hover {
    background-color: ${({ theme }) => theme.card};
  }
  &:focus {
    outline: none;
    box-shadow: none;
  }
  option {
    background-color: ${({ theme }) => theme.card};
    color: ${({ theme }) => theme.text};
  }
`;

const ThemeLabel = styled(P)`
  color: ${(p) => p.theme.text};
  font-weight: 600;
`;

const ThemeSelectRow = styled(Row)`
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const RefreshConfigButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  margin-right: auto;
  color: ${(p) => p.theme.subtext};
  text-decoration: underline;
  font: inherit;
  cursor: pointer;
  display: inline-flex;
  &:hover {
    color: ${(p) => p.theme.text};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ThemeHelperText = styled(P)`
  font-size: 0.85rem;
  color: ${(p) => p.theme.subtext};
`;

const RefreshError = styled(ThemeHelperText)`
  color: ${(p) => p.theme.danger};
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
  const { mode, resolvedMode, setMode } = useContext(ThemePreferenceContext);
  const [refreshingConfig, setRefreshingConfig] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const handleThemeChange = (event) => {
    setMode(event.target.value);
  };
  const handleRefreshConfig = async () => {
    if (refreshingConfig) return;
    setRefreshError(null);
    setRefreshingConfig(true);
    try {
      const response = await fetch(url(`/admin/refresh-config`), {
        method: "POST",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }
      await response.json().catch(() => null);
      if (typeof window !== "undefined" && window.location) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to refresh config", err);
      setRefreshError("Unable to refresh config. Please try again.");
    } finally {
      setRefreshingConfig(false);
    }
  };
  const themeOptions = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  if (loading) return null;

  return (
    <FooterContainer style={{}}>
      <FooterRow>
        <FooterColumn>
          <P>{workspace.name}</P>
          {workspace?.footerLinks?.map((link) => (
            <TextLink to={link.url} key={`${link.icon}-${link.url}`}>
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
          <RefreshConfigButton
            type="button"
            onClick={handleRefreshConfig}
            disabled={refreshingConfig}
          >
            {refreshingConfig ? "Refreshing..." : "Refresh config"}
          </RefreshConfigButton>
        </FooterColumn>
        <FooterColumn>
          <ThemeSelectRow>
            <ThemeLabel style={{ margin: 0 }}>Theme</ThemeLabel>
            <ThemeSelect value={mode} onChange={handleThemeChange}>
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </ThemeSelect>
          </ThemeSelectRow>
        </FooterColumn>
      </FooterRow>
      <Spacer height="20px" />
      <P style={{ textAlign: "center" }}>
        Copyright © {new Date().getFullYear()} {workspace.name} and PingPal
      </P>
    </FooterContainer>
  );
};
