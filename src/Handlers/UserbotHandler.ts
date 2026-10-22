import { Api, TelegramClient } from "teleproto";
import { NewMessageEvent } from "teleproto/events";
import { Cache } from "../Utils/Cache";

export type Role = "victim" | "solver";

type Deferred = {
  promise: Promise<Buffer | null>;
  resolve: (v: Buffer | null) => void;
};

const store = new Map<string, Deferred>();

function getDeferred(pollId: string): Deferred {
  let d = store.get(pollId);
  if (!d) {
    let resolve!: (v: Buffer | null) => void;
    const promise = new Promise<Buffer | null>((r) => (resolve = r));
    d = { promise, resolve };
    store.set(pollId, d);
    setTimeout(() => store.delete(pollId), 5 * 60 * 1000);
  }
  return d;
}

const norm = (v: unknown) => String(v).replace(/^-100/, "").replace(/^-/, "");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class UserbotHandler {
  client: TelegramClient;
  role: Role;

  constructor(client: TelegramClient, role: Role) {
    this.client = client;
    this.role = role;
  }

  public async handle(event: NewMessageEvent) {
    const msg = event.message;
    if (msg.out) return;
    if (String(msg.senderId) !== String(process.env["BOT_KUIS"])) return;
    if (!(msg.media instanceof Api.MessageMediaPoll)) return;

    const gId = Cache.get(`gId`);
    if (!gId) return;
    if (norm(msg.chatId) !== norm(gId)) return;

    const poll = msg.media.poll;
    if (!poll.quiz || poll.closed) return;
    const answers = poll.answers.filter(
      (a): a is Api.PollAnswer => a instanceof Api.PollAnswer,
    );
    if (!answers.length) return;

    const pollId = String(poll.id);
    const d = getDeferred(pollId);

    if (this.role === "victim") {
      const pick = answers[Math.floor(Math.random() * answers.length)];
      const correct = await this.vote(msg, Buffer.from(pick.option));
      d.resolve(correct);
      return;
    }

    const correct = await Promise.race([
      d.promise,
      sleep(30_000).then(() => null),
    ]);
    if (!correct) return;
    await this.vote(msg, correct);
  }

  private async vote(msg: Api.Message, option: Buffer): Promise<Buffer | null> {
    const peer = await msg.getInputChat();
    if (!peer) return null;

    try {
      const res: any = await this.client.invoke(
        new Api.messages.SendVote({ peer, msgId: msg.id, options: [option] }),
      );

      const upd = (res.updates ?? []).find(
        (u: any) => u instanceof Api.UpdateMessagePoll,
      ) as Api.UpdateMessagePoll | undefined;

      let correct = upd?.results?.results?.find((r) => r.correct);

      if (!correct) {
        const r2: any = await this.client.invoke(
          new Api.messages.GetPollResults({ peer, msgId: msg.id }),
        );
        const u2 = (r2.updates ?? []).find(
          (u: any) => u instanceof Api.UpdateMessagePoll,
        ) as Api.UpdateMessagePoll | undefined;
        correct = u2?.results?.results?.find((r) => r.correct);
      }

      return correct ? Buffer.from(correct.option) : null;
    } catch (e) {
      console.error(`[${this.role}] gagal vote:`, e);
      return null;
    }
  }
}
