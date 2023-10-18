const express = require("express");
const jwt = require("jsonwebtoken");
const { PRIVATE_KEY, user, tokenValited } = require("./auth");
const fs = require("fs");

const app = express();

app.use(express.json());

app.listen(3000, () => {
  console.log("Server is running on port 3000.");
});

app.get("/", (req, res) => {
  return res.status(200).send("Hello World!");
});

app.get("/login", (req, res) => {
  const [, hash] = req.headers.authorization?.split(" ") || [" ", " "];
  const [email, password] = Buffer.from(hash, "base64").toString().split(":");

  try {
    const correctPassword = email === user.email && password === "123456";

    if (!correctPassword)
      return res.status(401).send("Usuário ou senha inválidos");

    const token = jwt.sign({ user: JSON.stringify(user) }, PRIVATE_KEY, {
      expiresIn: "1h",
    });

    return res.status(200).json({ data: { user, token } });
  } catch (error) {
    console.log(error);
    return res.send(error);
  }
});

app.use("*", tokenValited);

app.get("/getOne/:id", (req, res) => {
  try {
    const id = req.params.id;
    const rawdata = fs.readFileSync(
      "./reports/".concat(id.concat("-emag.json"))
    );
    const report = JSON.parse(rawdata);
    res.statusCode = 200;
    res.json(report);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
