import { config } from "dotenv";
config({ path: ".env" });

import { Bot } from "grammy";
import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { NewMessage } from "teleproto/events";
import { BotHandler } from "./Handlers/BotHandler";
import { UserbotHandler, Role } from "./Handlers/UserbotHandler";

const apiId = Number(process.env["API_ID"]);
const apiHash = String(process.env["API_HASH"]);

async function startUserbot(session: string | undefined, role: Role) {
  if (!session) throw new Error(`SESSION_STRING untuk ${role} kosong`);

  const client = new TelegramClient(
    new StringSession(session),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    },
  );
  await client.connect();

  const me = await client.getMe();
  console.log(
    `[${role}] login sebagai ${(me as any).username ?? (me as any).id}`,
  );

  client.addEventHandler(async (event) => {
    try {
      await new UserbotHandler(client, role).handle(event);
    } catch (e) {
      console.error(`[${role}] error:`, e);
    }
  }, new NewMessage({}));

  return client;
}

async function main() {
  await startUserbot(process.env["SESSION_STRING_1"], "solver");
  await startUserbot(process.env["SESSION_STRING_2"], "victim");

  const bot = new Bot(String(process.env["BOT_TOKEN"]));
  bot.on("message", (ctx) => new BotHandler(ctx).handle());
  bot.start();
  console.log("semua jalan");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
