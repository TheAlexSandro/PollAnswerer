import { Context } from "grammy";
import { Cache } from "../Utils/Cache";

export class BotHandler {
  ctx: Context;
  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  public handle() {
    const chatId = String(this.ctx.chat?.id);
    if (chatId !== String(process.env["ADMIN"])) return;
    let mc;

    var pola = /^\/start$/i;
    if (pola.exec(this.ctx.message?.text!)) {
      return this.ctx.reply(
        "cmd:\n/set (group_id) - set group\n/g - lihat grup\n/rm - hapus",
      );
    }

    var pola = /^\/set\s+(.*)$/i;
    if ((mc = pola.exec(this.ctx.message?.text!))) {
      Cache.set(`gId`, mc[1]);
      return this.ctx.reply(`oke`);
    }

    var pola = /^\/g$/i;
    if (pola.exec(this.ctx.message?.text!)) {
      const gets = Cache.get(`gId`);
      if (!gets) return this.ctx.reply(`Tidak ada`);
      return this.ctx.reply(String(gets));
    }

    var pola = /^\/rm$/i;
    if (pola.exec(this.ctx.message?.text!)) {
      Cache.del(`gId`);
      return this.ctx.reply(`Oke`);
    }
  }
}
