import React, { useMemo, useState } from "react";
import { Between, Column, H4, P, Row, Spacer } from "../../kit";
import {
  Card,
  DropdownButton,
  Duration,
  Hr,
  HrHiddenLarge,
  OutageDetail,
  OutageDetailsContainer,
  Tooltip,
} from "./Kit";
import { Comment } from "./Comment";
import moment from "moment";
import { Green, Red } from "../Kit";
import { CaretRight } from "@phosphor-icons/react";
import { useTheme } from "styled-components";
import useOutageDetails from "../../hooks/useOutage";

const combineSequentialFailures = (failures = []) => {
  if (!failures.length) return [];

  const ordered = [...failures].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const grouped = [];
  let currentGroup = {
    start: ordered[0].createdAt,
    end: ordered[0].createdAt,
    reason: ordered[0].reason,
    failures: [ordered[0].id],
  };

  for (let i = 1; i < ordered.length; i++) {
    const failure = ordered[i];
    if (failure.reason === currentGroup.reason) {
      currentGroup.end = failure.createdAt;
      currentGroup.failures.push(failure.id);
    } else {
      grouped.push(currentGroup);
      currentGroup = {
        start: failure.createdAt,
        end: failure.createdAt,
        reason: failure.reason,
        failures: [failure.id],
      };
    }
  }

  grouped.push(currentGroup);
  return grouped;
};

const Outage = ({ outage, serviceId, open: _open = false }) => {
  const [open, setOpen] = useState(_open);
  const theme = useTheme();

  const { outage: detailedOutage, loading: detailsLoading } = useOutageDetails({
    outageId: outage?.id,
    serviceId,
    enabled: open,
  });

  const failureSource = detailedOutage?.failures || [];
  const sortedFailures = useMemo(
    () => combineSequentialFailures(failureSource),
    [failureSource]
  );

  const comments = detailedOutage?.comments || outage?.comments || [];

  const outageStart = detailedOutage?.start || outage?.start || null;
  const outageEnd = detailedOutage?.end || outage?.end || null;

  const switchFailureType = (type) => {
    switch (type) {
      case "STATUS_CODE":
        return [
          "Status Code",
          "The service returned an unexpected status code",
        ];
      case "REQUEST_FAILURE":
        return ["Request Failure", "The HTTP request failed"];
      case "EXPECTED_TEXT":
        return [
          "Expected Text",
          "The response did not contain the expected text",
        ];
      case "LATENCY":
        return ["Latency", "The request took longer than expected"];
      case "NO_RESPONSE":
        return ["No Response", "The service did not respond"];
      default:
        return ["Unknown", `An unknown error occurred (${type})`];
    }
  };

  if (!outage || !outageStart || !outageEnd) {
    return null;
  }

  return (
    <Card>
      <Between style={{ cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <Row style={{ gap: 10 }}>
          <DropdownButton open={open} onClick={() => setOpen(!open)}>
            <CaretRight size={20} color={theme.subtext} />
          </DropdownButton>
          <P>
            {moment(outageEnd).format("M/D, h:mm:ss a")} - {" "}
            {moment(outageStart).format("M/D, h:mm:ss a")}
          </P>
        </Row>
        <span>
          {outage.status === "OPEN" ? (
            <Red>Open</Red>
          ) : (
            <Green>Resolved</Green>
          )}
        </span>
      </Between>
      {open && <Hr />}
      <OutageDetailsContainer open={open}>
        <OutageDetail>
          <H4>Outage Information</H4>
          <Between>
            <P>Duration</P>
            <Duration start={outageStart} end={outageEnd} />
          </Between>
          <Between
            style={{
              alignItems: "flex-start",
            }}
          >
            <P>Reason</P>
            <Column
              style={{
                textAlign: "right",
              }}
            >
              {detailsLoading ? (
                <P style={{ opacity: 0.7 }}>Loading details...</P>
              ) : sortedFailures.length > 0 ? (
                sortedFailures.map((f) => (
                  <P key={`${f.start}-${f.end}`}>
                    {moment(f.start).format("h:mm:ss")} - {" "}
                    {moment(f.end).format("h:mm:ss")} {" "}
                    <Tooltip
                      text={switchFailureType(f.reason)[0]}
                      message={switchFailureType(f.reason)[1]}
                    />
                  </P>
                ))
              ) : (
                <P style={{ opacity: 0.7 }}>No detailed failures available</P>
              )}
            </Column>
          </Between>
          <Between>
            <P>Outage ID</P>
            <P>{outage.id}</P>
          </Between>
        </OutageDetail>
        <HrHiddenLarge />
        <OutageDetail>
          <Between>
            <H4>Official Comments</H4>
            {comments.length > 0
              ? `${comments.length} comment${comments.length > 1 ? "s" : ""}`
              : "No comments yet!"}
          </Between>
          {comments.length > 0 ? (
            <>
              <Spacer height="5px" />
              <Column>
                {comments.map((c) => (
                  <Comment key={c.id} comment={c} />
                ))}
              </Column>
            </>
          ) : (
            <>No comments yet</>
          )}
        </OutageDetail>
      </OutageDetailsContainer>
    </Card>
  );
};

export default Outage;
