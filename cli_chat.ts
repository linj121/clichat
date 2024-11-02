import { WechatyBuilder, type Sayable } from "wechaty";
import type { WechatyInterface, ContactInterface, RoomInterface, MessageInterface } from "wechaty/impls";
import * as readline from "readline";
import { type PathLike, mkdirSync, accessSync } from "node:fs";

enum AnsiColor {
  RESET = '\x1b[0m',
  BRIGHT = '\x1b[1m',
  DIM = '\x1b[2m',
  RED = '\x1b[31m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  BLUE = '\x1b[34m',
  MAGENTA = '\x1b[35m',
  CYAN = '\x1b[36m',
  WHITE = '\x1b[37m',
}

interface Arg {
  flag: string | undefined;
  value: string | undefined;
}

type TargetType = "room" | "contact";

function commandLineParser(command: string): Arg[] {
  const regex = new RegExp(
    ' *(?:-+([^= \'\"]+)[= ]?)?(?:([\'\"])([^\\2]+?)\\2|([^- \"\']+))?',
    'gm'
  );
  const matches = command.matchAll(regex);
  const argV: Arg[] = [];
  for (const match of matches) {
    const wholeMatch = match[0];
    if (!wholeMatch || wholeMatch === "") continue;
    const flag = match[1];
    const quote = match[2];
    const quotedContent = match[3];
    const unquotedContent = match[4];
    argV.push({
      flag: flag,
      value: quote ? quotedContent : unquotedContent
    });
  }
  return argV;
}

class CLI {
  private rl: readline.Interface;
  private originalConsoleLog: typeof console.log;

  constructor(
    private bot: WechatyInterface,
    private promptMessage: string,
  ) {
    this.originalConsoleLog = console.log.bind(console);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${AnsiColor.BRIGHT}${AnsiColor.GREEN}${promptMessage}> ${AnsiColor.RESET}`,
    });
    this.overrideConsoleLog();
    this.setupListeners();
    this.rl.prompt();
  }

  private overrideConsoleLog() {
    console.log = (...args: any[]) => {
      this.log(...args);
    };
  }

  private resetConsoleLog() {
    console.log = this.originalConsoleLog;
  }

  private log(...args: any[]): void {
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    this.originalConsoleLog(...args);
    this.rl.prompt(true);
  }

  private async processCommand(line: string): Promise<void> {
    const args = commandLineParser(line.trim());
    if (args.length === 0) return;

    const command = args[0].value;
    if (command === 'send') {
      let target: string | null = null;
      let targetType: TargetType = 'contact';
      let message: string | null = null;

      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.flag === 't' || arg.flag === 'targetType') {
          targetType = (arg.value as TargetType) || 'contact';
        } else if (arg.flag === 'm' || arg.flag === 'message') {
          message = arg.value || '';
        } else if (!arg.flag && !target) {
          target = arg.value || '';
        } else {
          this.log('Unknown option or too many targets:', arg.value);
        }
      }

      if (!target || !message) {
        this.log('Usage: send <target> -t <room|contact> -m <message>');
      } else {
        try {
          await sendMessage(this.bot, targetType, target, message);
        } catch (err) {
          this.log('Error sending message:', err);
        }
      }
    } else {
      this.log('Unknown command:', command);
    }
  }

  private setupListeners(): void {
    this.rl.on('line', async (line: string) => {
      await this.processCommand(line);
      this.rl.prompt();
    }).on('close', () => {
      this.resetConsoleLog();
      console.log('Exiting program.');
      process.exit(0);
    });
  }
}

/**
 * 
 * @param ctx The message object from wechaty
 * @param response A Sayable response object to send
 * Send response to:
 * 1. A room, if ctx is from a group chat
 * 2. DM, if ctx is from DM. When the message is send by self, send it to the receiver
 */
async function respond(ctx: MessageInterface, response: Sayable): Promise<void> {
  // Handle Group Messages
  const room = ctx.room();
  if (room) {
    await room.say(response);
    return;
  }

  // Handle Direct Messages
  if (ctx.self()) {
    const listener = ctx.listener();
    if (!listener) throw new Error("Message target cannot be resolved");
    await listener.say(response);
  } else {
    await ctx.say(response);
  }
}

async function sendMessage(bot: WechatyInterface, targetType: TargetType, target: string, message: string): Promise<void> {
  let targetInstance: RoomInterface | ContactInterface | undefined = undefined;
  if (targetType === "room") {
    targetInstance = await bot.Room.find({ topic: target });
  } else {
    targetInstance = await bot.Contact.find({ name: target });
  }

  if (!targetInstance) {
    console.log(`Error: ${targetType} "${target}" not found.`);
    return;
  }

  await targetInstance.say(message);
  console.log(`Message sent to ${targetType} "${target}": ${message}`);
}

function createCacheDirIfNotExists(path: PathLike): void {
  try {
    accessSync(path);
  } catch (error) {
    console.log(`Folder ${path} does not exist, creating...`);
    mkdirSync(path);
  }
}

async function main(): Promise<void> {
  const NUMBER_OF_BOTS: number = 10;
  const CACHE_DIR = "./data";
  const yourBotNum: number = 0;
  const bots: WechatyInterface[] = [];

  createCacheDirIfNotExists(CACHE_DIR);

  for (let i = 0; i < NUMBER_OF_BOTS; i++) {
    const botId: string = "bot" + i;

    const bot = WechatyBuilder.build({
      name: `${CACHE_DIR}/${botId}`,
      puppet: "wechaty-puppet-wechat",
      puppetOptions: {
        uos: true,
      }
    });

    bot
      .on("start", () => console.log(`[${botId}] bot has started!`))
      .on("login", (user: ContactInterface) => {
        console.log(`[${botId}] User ${user.name()} logged in`);
        if (i === yourBotNum) {
          console.log("Starting CLI...");
          new CLI(bot, botId);
        }
      })
      .on("scan", (qrcode: string, status: any) =>
        console.log(`[${botId}] Scan QR Code to login: status=${status} || https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`)
      )
      .on("message", async (message: MessageInterface) => {
        console.log(`[${botId}] on(message): ${i === yourBotNum ? message.toString() : "Received a message"}`);
        if (/^妈妈$/i.test(message.text())) {
          await respond(message, `生的 (from ${botId})`);
        }
      });

    bots.push(bot);
  }

  console.log("Starting all bots...");
  await Promise.all(bots.map(bot => bot.start()));
}

if (require.main === module) {
  main().catch(err => console.error(err));
}

export {
  commandLineParser,
  sendMessage,
};
