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

const Outage = ({ outage, open: _open = false }) => {
  const [open, setOpen] = useState(_open);
  const theme = useTheme();

  const sortedFailures = useMemo(
    () => combineSequentialFailures(outage?.failures || []),
    [outage?.failures]
  );

  const outageDuration = useMemo(() => {
    if (!sortedFailures.length) return 0;
    const startTime = sortedFailures[0].start;
    const endTime = sortedFailures[sortedFailures.length - 1].end;
    const diff = moment(endTime).diff(moment(startTime));
    const duration = moment.duration(diff);
    return duration.asSeconds();
  }, [sortedFailures]);

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

  if (!outage || outageDuration === 0 || sortedFailures.length === 0) {
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
            {moment(sortedFailures[sortedFailures.length - 1].end).format(
              "M/D, h:mm:ss a"
            )}{" "}
            - {moment(sortedFailures[0].start).format("M/D, h:mm:ss a")}
          </P>
        </Row>
        <span>
          {outage.status === "OPEN" ? (
            <>
              <Red>Open</Red>
            </>
          ) : (
            <>
              <Green>Resolved</Green>
            </>
          )}
        </span>
      </Between>
      {open && <Hr />}
      <OutageDetailsContainer open={open}>
        <OutageDetail>
          <H4>Outage Information</H4>
          <Between>
            <P>Duration</P>
            <Duration
              start={sortedFailures[0].start}
              end={sortedFailures[sortedFailures.length - 1].end}
            />
          </Between>
          <Between
            style={{
              alignItems: "flex-start",
            }}
          >
            <P data-f={JSON.stringify(sortedFailures)}>Reason</P>
            <Column
              style={{
                textAlign: "right",
              }}
            >
              {sortedFailures.map((f) => (
                <P key={f.start}>
                  {moment(f.start).format("h:mm:ss")} -{" "}
                  {moment(f.end).format("h:mm:ss")}{" "}
                  <Tooltip
                    key={f.start}
                    text={switchFailureType(f.reason)[0]}
                    message={switchFailureType(f.reason)[1]}
                  />
                </P>
              ))}
            </Column>
          </Between>
          <Between>
            <P>Outage ID</P>
            <P>{outage.id.split("-")[0]}</P>
          </Between>
        </OutageDetail>
        <HrHiddenLarge />
        <OutageDetail>
          <Between>
            <H4>Official Comments</H4>
            {outage.comments && outage.comments?.length > 0
              ? `${outage.comments.length} comment${
                  outage.comments.length > 1 ? "s" : ""
                }`
              : "No comments yet!"}
          </Between>
          {outage.comments && outage.comments?.length > 0 ? (
            <>
              <Spacer height="5px" />
              <Column>
                {outage.comments?.map((c) => (
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
