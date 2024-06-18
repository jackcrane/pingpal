import React, { useEffect } from "react";

const useElementWidth = (elementId) => {
  const [width, setWidth] = React.useState(0);

  const trigger = () => {
    const element = document.getElementById(elementId);
    console.log("triggered");
    if (element) {
      setWidth(element.offsetWidth);
    }
  };

  useEffect(() => {
    trigger();
  }, [elementId]);

  return [width, trigger];
};

export default useElementWidth;
