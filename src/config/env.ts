import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),

  mail: {
    from: process.env.MAIL_FROM || "monitor@example.com",
    to: process.env.MAIL_TO || "admin@example.com",
  },
};
