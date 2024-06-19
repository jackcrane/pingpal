import React, { useState } from "react";
import { PillHoverHost } from "./Kit";
import useKeyPressed from "../hooks/useKeyPressed";

export const PillHoverHostController = ({
  bucket,
  index,
  currentBucketIndex,
  setCurrentBucketIndex,
}) => {
  const [hovered, setHovered] = useState(false);
  const pressed = useKeyPressed("Shift");

  const handleHover = (status) => {
    if (pressed) return;
    setHovered(status);
    setCurrentBucketIndex(index);
  };

  return (
    <PillHoverHost
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      hovered={index === currentBucketIndex}
    >
      {bucket.bucket}
    </PillHoverHost>
  );
};
