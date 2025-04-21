const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

module.exports = async ({ req, log, error }) => {
  const payload = JSON.parse(req.body);
  const userId = payload.userId;

  const client = new sdk.Client();
  const users = new sdk.Users(client);
  const db = new sdk.Databases(client);

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  try {
    // Get user details
    const user = await users.get(userId);
    const email = user.email;

    // Generate token (OTP or random string)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Store in DB
    await db.createDocument(
      "[DATABASE_ID]",
      "[COLLECTION_ID]",
      "unique()",
      {
        userId,
        email,
        token,
        expiresAt
      }
    );

    // Generate verification link
    const verifyUrl = `${process.env.VERIFY_URL_BASE}?userId=${userId}&token=${token}`;

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Verify Your Email",
      html: `
        <p>Hi ${user.name || ''},</p>
        <p>Click the link below to verify your email address:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    log(`Verification email sent to ${email}`);

  } catch (err) {
    error(`Error sending verification email: ${err.message}`);
  }
};
