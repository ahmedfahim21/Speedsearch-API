import { Redis } from "@upstash/redis/cloudflare";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";


export const runtime = "edge";

const app = new Hono().basePath('/api');
app.use("/*", cors());

type EnvConfig = {
    UPSTASH_REDIS_REST_TOKEN: string;
    UPSTASH_REDIS_REST_URL: string;
};

app.get('/search', async(c) => {
    try {
        const { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } = env<EnvConfig>(c);

        const redis = new Redis({
            url: UPSTASH_REDIS_REST_URL,
            token: UPSTASH_REDIS_REST_TOKEN
        });
    
        const start = performance.now();
    
        const query = c.req.query('q')?.toUpperCase();
    
        if(!query) {
            return c.json({message: 'Invalid query'}, {status: 400});
        }
    
        const res = []
        const rank = await redis.zrank("terms", query);
    
        if(rank !== null && rank !== undefined) {
            const keys = await redis.zrange<string[]>("terms", rank, rank + 10);
            for(const key of keys) {
                if(!key.startsWith(query)) {
                    break;
                }
    
                if(key.endsWith('*')) {
                    res.push(key.slice(0, -1))
                }
            }
        }
    
        const end = performance.now();
    
        return c.json({
            results: res,
            duration: end - start
        })
    }
    catch(e) {
        return c.json({message: 'Internal server error'}, {status: 500});
    }
});

export const GET = handle(app);
export default app as never;

