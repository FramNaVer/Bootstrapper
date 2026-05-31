import "dotenv/config";
import express, { Request, Response } from "express";
import passport from "passport";
import authRouter from "./src/presentation/routes/auth.route";

const app = express();
const port = 3000;

app.use(express.json());
app.use(passport.initialize());

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.use("/api/auth", authRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
