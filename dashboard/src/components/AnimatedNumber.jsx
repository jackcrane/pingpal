import React, { useEffect, useState } from "react";
import styled from "styled-components";

const NumberWrapper = styled.span`
  display: inline-block;
  transition: transform ${({ animationDuration }) => animationDuration}ms
    ease-out;
`;

const AnimatedNumber = ({
  number,
  animationDuration = 250,
  decimalPlaces = 2,
  ...props
}) => {
  const [displayNumber, setDisplayNumber] = useState(0);

  useEffect(() => {
    const start = performance.now();

    const step = (timestamp) => {
      const progress = Math.min((timestamp - start) / animationDuration, 1);
      setDisplayNumber(number * progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [number, animationDuration]);

  const formatNumber = (num) => {
    if (Number.isInteger(number)) {
      return Math.round(num);
    }
    return num.toFixed(decimalPlaces);
  };

  return (
    <NumberWrapper animationDuration={animationDuration} {...props}>
      {formatNumber(displayNumber)}
    </NumberWrapper>
  );
};

export default AnimatedNumber;
