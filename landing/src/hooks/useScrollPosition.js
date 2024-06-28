import React, { useState, useEffect } from "react";

const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      setScrollPosition(window.pageYOffset);
      setScrollPercent(
        Math.round(
          (window.pageYOffset /
            (document.body.scrollHeight - window.innerHeight)) *
            100
        )
      );
    };
    window.addEventListener("scroll", updatePosition);
    updatePosition();
    return () => window.removeEventListener("scroll", updatePosition);
  }, []);

  return [scrollPosition, scrollPercent];
};

export default useScrollPosition;
