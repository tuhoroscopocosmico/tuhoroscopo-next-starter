import { IronSessionOptions } from "iron-session";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not defined in .env.local");
}

export const sessionOptions: IronSessionOptions = {
  cookieName: "thc_session",
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

declare module "iron-session" {
  interface IronSessionData {
    subscriber?: {
      nombre: string;
      signo: string;
      whatsapp: string;
    };
  }
}

