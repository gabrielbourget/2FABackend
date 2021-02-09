// -> Beyond codebase
import "dotenv/config";
import express from "express";
import speakeasy from "speakeasy";
import { v4 } from "uuid";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig";
import qrcode from "qrcode";
// -> Within codebase
import { generateOTPauthUrl } from "./helpers";
import { APP_NAME } from "./Constants"

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

    db.push(path, { id });
    res.json({ userId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating the secret" });
  }
})

// -> Enable 2FA
app.post("/api/enable", (req, res) => {
  const { userId } = req.body;

  try {
    const path = `/user/${userId}`;
    const temp2FASecret = speakeasy.generateSecret({ name: APP_NAME });
    const otpauth = generateOTPauthUrl(APP_NAME, temp2FASecret.base32);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qrcode.toDataURL(otpauth, (err: any, imageUrl: string) => {
      if (err) {
        console.error(err);
        return;
      }

      const QRCodeImageUrl = imageUrl;
      db.push(path, { temp2FASecret });
      res.json({ userId, temp2FASecret, QRCodeImageUrl });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error finding the user" });
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
