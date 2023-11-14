const jwt = require("jsonwebtoken");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const user = {
  name: process.env.USER_NAME,
  email: process.env.USER_EMAIL,
};

function tokenValited(req, res, next) {
  const [, token] = req.headers.authorization?.split(" ") || [" ", " "];

  if (!token) return res.status(401).send("Token não informado");

  try {
    const payload = jwt.verify(token, PRIVATE_KEY);
    const userIdFromToken = typeof payload != "string" && payload.user;

    if (!user && !userIdFromToken)
      return res.status(401).send("Token inválido");

    req.headers["user"] = payload.user;

    return next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: "Token inválido" });
  }
}

module.exports = { PRIVATE_KEY, user, tokenValited };
