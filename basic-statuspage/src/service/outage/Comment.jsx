import React from "react";
import { Card, CommentCard, H5, Tooltip } from "./Kit";
import { Column, P, Row } from "../../kit";
import { UserCircle } from "@phosphor-icons/react";
import moment from "moment";

export const Comment = ({ comment }) => {
  return (
    <CommentCard>
      <Row
        style={{
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <UserCircle size={24} />
        <Column>
          <Row style={{ gap: 10 }}>
            <H5>{comment.user.name}</H5>
            <P>
              {moment(comment.createdAt).format("M/D, h:mm:ss a")}(
              {moment(comment.createdAt).fromNow()})
            </P>
          </Row>
          <P>{comment.text}</P>
        </Column>
      </Row>
    </CommentCard>
  );
};
