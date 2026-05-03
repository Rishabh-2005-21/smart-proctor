import { Link } from "react-router-dom";

const Navbar = ({ title }) => {
  return (
    <div style={styles.nav}>
      <span>{title}</span>
      <Link style={styles.link} to="/">Logout</Link>
    </div>
  );
};

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 20px",
    backgroundColor: "#1e293b",
    color: "white"
  },
  link: {
    color: "white",
    textDecoration: "none"
  }
};

export default Navbar;
