import { pool } from "./db.js";
import { createApp } from "./app.js";

createApp({ pool }).listen(process.env.PORT || 3000);
