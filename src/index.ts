import express from "express";
import cors from "cors";
import Logger from "./logger.js";
import helmet from "helmet";
import morganMiddleware from "./middlewares/morganmiddleware.js";
import swaggerUi from "swagger-ui-express";
import {specs} from "./config/swagger.js";
import dotenv from "dotenv";

dotenv.config();

const app=express();
const PORT=process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());
app.use(helmet());
app.use(morganMiddleware);


app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(specs))


const server=app.listen(PORT,()=>{
    Logger.info(`server is running on port ${PORT}, 
        environment: ${process.env.NODE_ENV}, timestamp: 
        ${new Date().toISOString()}`);
})

export {server,app};

