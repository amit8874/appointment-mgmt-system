import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Force a slightly delayed scroll to ensure any content rendering doesn't jump the scroll back
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" // Use instant for navigation to feel snappy and correct
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
