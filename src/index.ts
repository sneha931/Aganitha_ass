import express from "express";
import cors from "cors";
import Logger from "./logger.js";
import helmet from "helmet";
import morganMiddleware from "./middlewares/morganmiddleware.js";
import swaggerUi from "swagger-ui-express";
import {specs} from "./config/swagger.js";
import dotenv from "dotenv";

import pasteroutes from "./routes/pasteroutes.js";
import { viewPaste } from "./controllers/past.controllers.js";

dotenv.config();

const app=express();
const port=process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());
app.use(helmet());
app.use(morganMiddleware);


app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(specs))
app.use("/api",pasteroutes);
// Public HTML view endpoint at root level
app.get("/p/:id", viewPaste);

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started successfully on port ${port}`);
});

export { app, server };
export default app;

