import React from "react";
import { P } from "../kit";

export const Modification = ({ oldObject, newObject }) => {
  const keys = Object.keys(newObject);

  // Find the keys that have changed
  const [changedKeys, unchangedKeys] = keys.reduce(
    ([changedKeys, unchangedKeys], key) => {
      if (oldObject[key] !== newObject[key]) {
        return [[...changedKeys, key], unchangedKeys];
      }
      return [changedKeys, [...unchangedKeys, key]];
    },
    [[], []]
  );

  if (changedKeys.length === 0)
    return (
      <P>
        No changes were made. When you make changes to your workspace they will
        appear here.
      </P>
    );

  return <div>{JSON.stringify(changedKeys)}</div>;
};
