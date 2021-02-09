import "dotenv/config";
import express from "express";
import speakeasy from "speakeasy";
import { v4 } from "uuid";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig";

const { PORT } = process.env;

const app = express();

app.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const db = new JsonDB(new Config('2fa-db', true, false, '/'));

db.exists("/api");

app.get("/api", (_req, res) => {
  res.json({ message: "welcome to the 2fa app" });
})

// -> Register a user, create a temp secret.
app.post("/api/register", (_req, res) => {
  const id = v4();

  try {
    const path = `/user/${id}`
    const temp2FASecret = speakeasy.generateSecret({
      name: "Syntronic MFA App"
    });

    // -> Embed secret into QR Code
    // -> Base64 URL for the PNG

    db.push(path, { id, temp2FASecret });
    res.json({ id, temp2FASecret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating the secret" });
  }
})

// -> Verify token and make the secret permanent
app.post("/api/verify", (req, res) => {
  const { token, userId } = req.body;

  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);
    console.log("user -> ", user);
    const { temp2FASecret: { base32: secret }} = user;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token
    });

    if (verified) {
      db.push(path, { id: userId, secret: user.temp2FASecret });
      res.json({ verified: true });
    } else {
      res.json({ verified: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error finding the user" });
  }
})

// -> Validate token and make the secret permanent
app.post("/api/validate", (req, res) => {
  const { token, userId } = req.body;

  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);
    console.log("user -> ", user);
    const { secret: { base32: secret }} = user;

    const tokenValidated = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (tokenValidated) res.json({ validated: true });
    else res.json({ validated: false });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error finding the user" });
  }
})

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
