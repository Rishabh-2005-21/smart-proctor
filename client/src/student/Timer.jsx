import { useEffect, useState } from "react";

export default function Timer({ minutes }) {
  const [time, setTime] = useState(minutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          alert("Time up! Quiz auto-submitted");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const min = Math.floor(time / 60);
  const sec = time % 60;

  return (
    <h3>
      Time Left: {min}:{sec < 10 ? `0${sec}` : sec}
    </h3>
  );
}
