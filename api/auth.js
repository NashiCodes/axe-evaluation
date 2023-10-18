const jwt = require("jsonwebtoken");

const PRIVATE_KEY = "1010FF";
const user = {
  name: "CGCO",
  email: "web.cgco@ufjf.br",
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
