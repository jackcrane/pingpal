import Styled from "styled-components";
import React from "react";
import { Between, H3, H4, P, Row, Spacer } from "../kit";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { useTheme } from "styled-components";
import Color from "color";

const FeatureTableContainer = Styled.div`
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 10px;
  overflow: hidden;
`;

const FeatureTableTable = Styled.table`
  width: calc(100% + 2px);
  border-collapse: collapse;
  margin: -1px;
`;

const Th = Styled.th`
  padding: 10px;
  border: 1px solid ${(props) => props.theme.border};
  @media screen and (max-width: 600px) {
    display: none;
  }
`;

const Td = Styled.td`
  padding: 10px;
  border: 1px solid ${(props) => props.theme.border};
  text-align: ${(props) => (props.left ? "left" : "center")};
  width: 70px;
  @media screen and (max-width: 600px) {
    &:not(:first-of-type) {
      display: none;
    }
  }
  /* Unset width for the first of type */
  &:first-of-type {
    width: unset;
  }

`;

const Tr = Styled.tr``;

const CheckIcon = () => {
  const theme = useTheme();
  return <CheckCircle size={24} color={theme.success} />;
};

const XIcon = () => {
  const theme = useTheme();
  return <XCircle size={24} color={theme.danger} />;
};

const BASIC_FEATURES = [
  {
    name: "Basic uptime monitoring",
    description: "Automated checks to track your application's uptime",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Response time monitoring",
    description: "Track how long your application takes to respond",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Advanced statistical displays",
    description:
      "Understand your application's perspective with advanced statistics",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Graphical data dashboard",
    description:
      "View your application's uptime & response time in beautiful graphs",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Status page",
    description: "Public status page to show status of multiple services",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Outage tracking",
    description: "Track ongoing outages across multiple failures",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Custom Links",
    description: "Add custom links to your status page's header and footer",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "Unlimited services",
    description:
      "Track the uptime of unlimited services (Free plan limited to 10)",
    free: false,
    launch: true,
    pro: true,
  },
];

const ALERT_FEATURES = [
  {
    name: "Email notifications",
    description: "Get notified by email when your application goes down",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "SMS notifications",
    description: "Get notified by text when your application goes down",
    free: false,
    launch: true,
    pro: true,
  },
  {
    name: "Slack notifications",
    description: "Get notified in Slack when your application goes down",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },
];

const DETAILED_TRACKING_FEATURES = [
  {
    name: "5 minute checks",
    description: "Check your application's uptime every 5 minutes",
    free: true,
    launch: true,
    pro: true,
  },
  {
    name: "1 minute checks",
    description: "Check your application's uptime every minute",
    free: false,
    launch: true,
    pro: true,
  },
  {
    name: "10 second checks",
    description: "Check your application's uptime every 10 seconds",
    free: false,
    launch: false,
    pro: true,
  },
  {
    name: "Body retention",
    description:
      "Keep your application's response body for debugging for 7 days",
    free: false,
    launch: true,
    pro: true,
  },
  {
    name: "Header retention",
    description:
      "Keep your application's response headers for debugging for 7 days",
    free: false,
    launch: true,
    pro: true,
  },
];

const RELATIONSHIP_FEATURES = [
  {
    name: "Issue official comments",
    description: "Issue official comments on outage reports",
    free: false,
    launch: true,
    pro: true,
  },
  {
    name: "Subscriber notifications",
    description: "Allow users to subscribe to your status page to get updates",
    free: false,
    launch: true,
    pro: true,
    preview: true,
  },
  {
    name: "Webhook notifications",
    description:
      "Allow users to subscribe to your status page to get updates via webhooks",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },
  {
    name: "Public API",
    description: "Allow third-party applications to read low-resolution data",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },
];

const ENTERPRISE_FEATURES = [
  {
    name: "Unlimited teammates",
    description: "Add unlimited teammates to your account",
    free: false,
    launch: true,
    pro: true,
  },

  {
    name: "Private API",
    description: "Allow your own applications to read high-resolution data",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },
  {
    name: "Custom domain",
    description: "Use your own domain for your status page",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },
  {
    name: "Custom branding",
    description: "Replace the PingPal branding with your own",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },

  {
    name: "Data export",
    description:
      "Export your application's uptime & response time data to CSV or JSON",
    free: false,
    launch: false,
    pro: true,
    preview: true,
  },
];

const PreviewPill = Styled.span`
  background-color: ${(props) => Color(props.theme.blue).alpha(0.1).string()};
  color: ${(props) => props.theme.blue};
  border: 1px solid ${(props) => props.theme.blue};
  border-radius: 15px;
  padding: 1px 6px;
  font-size: 0.6rem;
  margin-left: 10px;
  font-weight: bold;
`;

const MobileFeatureRow = Styled(Row)`
  display: none;
  justify-content: flex-end;
  @media screen and (max-width: 600px) {
    display: flex;
  }
`;

const Card = Styled.div`
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 10px;
  padding: 5px;
  margin: 5px;
  width: 50px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
`;

const _FeatureTable = ({ data }) => {
  return (
    <FeatureTableContainer>
      <FeatureTableTable>
        <Tr>
          <Th></Th>
          <Th>Free</Th>
          <Th>
            Launch
            <br />
            $20/mo
          </Th>
          <Th>Pro $100/mo</Th>
        </Tr>
        {data.map((feature) => (
          <Tr>
            <Td left>
              <Row>
                <H4>{feature.name}</H4>
                {feature.preview && <PreviewPill>Preview</PreviewPill>}
              </Row>
              <P>{feature.description}</P>
              <MobileFeatureRow>
                <Card>
                  <b>Free</b>
                  {feature.free && <CheckIcon />}
                  {!feature.free && <XIcon />}
                </Card>
                <Card>
                  <b>Launch</b>
                  {feature.launch && <CheckIcon />}
                  {!feature.launch && <XIcon />}
                </Card>
                <Card>
                  <b>Pro</b>
                  {feature.pro && <CheckIcon />}
                  {!feature.pro && <XIcon />}
                </Card>
              </MobileFeatureRow>
            </Td>
            <Td>
              {feature.free && <CheckIcon />}
              {!feature.free && <XIcon />}
            </Td>
            <Td>
              {feature.launch && <CheckIcon />}
              {!feature.launch && <XIcon />}
            </Td>
            <Td>
              {feature.pro && <CheckIcon />}
              {!feature.pro && <XIcon />}
            </Td>
          </Tr>
        ))}
      </FeatureTableTable>
    </FeatureTableContainer>
  );
};

export const FeatureTable = () => {
  return (
    <>
      <H3>Basic features</H3>
      <Spacer />
      <_FeatureTable data={BASIC_FEATURES} />
      <Spacer height="30px" />
      <H3>Stay up-to-date</H3>
      <P>
        Stay up-to-date with your application with notifications and alerts sent
        to where you are.
      </P>
      <Spacer />
      <_FeatureTable data={ALERT_FEATURES} />
      <Spacer height="30px" />
      <H3>Detailed tracking</H3>
      <P>
        Understand your application's uptime and response time with detailed,
        high-resolution tracking.
      </P>
      <Spacer />
      <_FeatureTable data={DETAILED_TRACKING_FEATURES} />
      <Spacer height="30px" />
      <H3>Relationship features</H3>
      <P>
        Maintain your relationship with your customers and increase trust with
        transparent communication through PingPal.
      </P>
      <Spacer />
      <_FeatureTable data={RELATIONSHIP_FEATURES} />
      <Spacer height="30px" />
      <H3>Enterprise features</H3>
      <P>Advanced features for users who need more than just the basics.</P>
      <Spacer />
      <_FeatureTable data={ENTERPRISE_FEATURES} />
    </>
  );
};
