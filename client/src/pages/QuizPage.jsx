// student/Quiz.jsx
useEffect(() => {
  document.documentElement.requestFullscreen();

  const handleBlur = () => {
    axios.post("/api/proctor/violation", {
      type: "TAB_SWITCH"
    });
  };

  window.addEventListener("blur", handleBlur);
  return () => window.removeEventListener("blur", handleBlur);
}, []);
