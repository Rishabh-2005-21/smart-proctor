// middleware/auth.js
import jwt from "jsonwebtoken";

export const protect = (roles = []) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ msg: "Forbidden: insufficient role" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};
