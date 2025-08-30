import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/database/schema";

const database = drizzle(process.env.DATABASE_URL!, { schema });

export { database };
