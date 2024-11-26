import { WechatyBuilder, ScanStatus, type Sayable } from "wechaty";
import type { WechatyInterface, ContactInterface, RoomInterface, MessageInterface } from "wechaty/impls";
import * as readline from "readline";
import { type PathLike, mkdirSync, accessSync } from "node:fs";
import QRCode from "qrcode";

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

function truncate(str: string, maxLength: number): string {
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + '...';
  } else {
    return str;
  }
}

class CLI {
  private rl: readline.Interface;
  private originalConsoleLog: typeof console.log;
  private maxTableColumnCharNum: number = 35;

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

  private table(...args: any[]): void {
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    console.table(...args);
    this.rl.prompt(true);
  }

  private async search(pattern: string, targetType: TargetType | null): Promise<void> {
    let regex: RegExp;

    // Check if pattern is enclosed with slashes indicating regex
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        regex = new RegExp(pattern.slice(1, -1), 'i');
      } catch (error) {
        this.log('Invalid regular expression.');
        return;
      }
    } else {
      // Use fuzzy search pattern
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escapedPattern, 'i');
    }

    const truncateFixed = (str: string) => truncate(str, this.maxTableColumnCharNum);

    if (!targetType || targetType === 'contact') {
      this.log(`Searching contacts using ${regex.source} ...`);

      // Search both keys and combine them (use Set() to remove duplicates)
      const foundContacts = await Promise.all([
        this.bot.Contact.findAll({ name: regex }),
        this.bot.Contact.findAll({ alias: regex })
      ]);

      // Early return. Do not proceed if result is empty.
      if (foundContacts.every(resultArr => resultArr.length === 0)) {
        this.log("No matching contacts found :(");
        return;
      }

      const mergedContacts = Array.from(
        new Set([
          ...foundContacts[0],
          ...foundContacts[1]
        ])
      );

      // Transfrom data: extract fields we'd like to see
      const contactsData = await Promise.all(
        mergedContacts.map(async (contact) => ({
          id: truncateFixed(contact.id),
          alias: truncateFixed((await contact.alias()) || ''),
          name: truncateFixed(contact.name()),
        }))
      );

      if (contactsData.length > 0) {
        this.log("- Matched Contacts:");
        this.table(contactsData);
      } else {
        this.log("No matching contacts found :(");
      }
    }

    if (!targetType || targetType === 'room') {
      this.log(`Searching rooms using ${regex.source} ...`);
      const matchedRooms = await this.bot.Room.findAll({
        topic: regex,
      });

      const roomsData = await Promise.all(
        matchedRooms.map(async (room) => ({
          id: truncateFixed(room.id),
          topic: truncateFixed((await room.topic()) || ''),
        }))
      );

      if (roomsData.length > 0) {
        this.log("- Matched Rooms:");
        this.table(roomsData);
      } else {
        this.log("No matching rooms found :(");
      }
    }
  }


  private async processCommand(line: string): Promise<void> {
    const args = commandLineParser(line.trim());
    if (args.length === 0) return;

    const availableCommands: string[] = ["send", "ls", "search"];

    const usages: Record<string, string> = {
      "help": "Usage: help <command>\n" + "Available commands: " + availableCommands.join(", "),
      "send": "Usage: send <target> -t <room|contact> -m <message>",
      "ls": "Usage: ls [--contact | -c | --room | -r]",
      "search": "Usage: search <pattern> [-t | --targetType <room|contact>]",
    };

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
          this.log(usages["send"]);
        }
      }

      if (!target || !message) {
        this.log(usages["send"]);
      } else {
        try {
          await sendMessage(this.bot, targetType, target, message);
        } catch (err) {
          this.log('Error sending message:', err);
        }
      }
    } else if (command === 'help') {

      const { flag, value } = { ...args[1] }; // In case args[1] is undefined, return { }
      if (flag) {
        this.log(`Unexpected flag ${flag}`);
        this.log(usages["help"]);
        return;
      }
      if (!value) {
        this.log(usages["help"]);
        return;
      }
      if (!availableCommands.includes(value)) {
        this.log(`Unknown command ${value}\n`);
        this.log(usages["help"]);
        return;
      }

      this.log(usages[value]);

    } else if (command === "ls") {

      const { flag, value } = { ...args[1] };

      if (value) {
        this.log(`Unexpected argument ${value}. You should specify a flag instead of an argument.`);
        this.log(usages["ls"]);
        return;
      }

      const truncateFixed = (str: string) => truncate(str, this.maxTableColumnCharNum);

      const getAllRooms = async () => {
        this.log("Getting the list of all rooms...");
        const allRooms = await this.bot.Room.findAll();
        const allRoomsWithTopics = await Promise.all(allRooms.map(async (room) => {
          return {
            id: truncateFixed(room.id),
            topic: truncateFixed((await room.topic()) || ""),
          };
        }));

        this.log("- List of Group Chats (Rooms):");
        this.table(allRoomsWithTopics);
      }

      const getAllContacts = async () => {
        this.log("Getting the list of all contacts...");
        const allContacts = await this.bot.Contact.findAll();
        const allContactsWithAlias = await Promise.all(allContacts.map(async (contact) => {
          return {
            id: truncateFixed(contact.id),
            alias: truncateFixed((await contact.alias()) || ""),
            name: truncateFixed(contact.name()),
          };
        }))
        this.log("- List of Contacts:");
        this.table(allContactsWithAlias);
      };

      // Default behaviour: no flag
      if (!flag) {
        await Promise.all([getAllRooms(), getAllContacts()]);
        return;
      }

      if (flag === "contact" || flag === "c") {
        await getAllContacts();
      } else if (flag === "room" || flag === "r") {
        await getAllRooms();
      } else {
        this.log(`Invalid flag ${flag}`);
        this.log(usages["ls"]);
      }

    } else if (command === "search") {
      let pattern: string | null = null;
      let targetType: TargetType | null = null;

      for (let i = 1; i < args.length; i++) {
        const arg = args[i] || {};
        if (arg.flag === 't' || arg.flag === 'targetType') {
          targetType = (arg.value as TargetType) || null;
        } else if (!arg.flag && !pattern) {
          pattern = arg.value || '';
        } else {
          this.log('Unknown option or too many patterns:', arg.value);
          this.log(usages["search"]);
          return;
        }
      }

      if (!pattern) {
        this.log('Please provide a search pattern.');
        this.log(usages["search"]);
        return;
      }

      try {
        await this.search(pattern, targetType);
      } catch (err) {
        this.log('Error during search:', err);
      }
    } else {
      this.log('Unknown command:', command);
    }
  }

  private setupListeners(): void {
    this.rl.on('line', async (line: string) => {
      try {
        await this.processCommand(line);
      } catch (error) {
        this.log(error);
      }
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
  // console.log(`Message sent to ${targetType} "${target}": ${message}`);
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
  const NUMBER_OF_BOTS: number = 2;
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
          new CLI(bot, `[${botId}] ${user.name()} `);
        }
      })
      .on("scan", async (qrcode: string, status: any) => {
        if (status === ScanStatus.Timeout || status === ScanStatus.Waiting) {
          const qrcodeUrl = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
          console.log(`[${botId}] on(scan) ${ScanStatus[status]}, ${status}, ${qrcodeUrl}`);
          const consoleQRCode = await QRCode.toString(qrcode, { type: "terminal", small: true });
          console.log(`[${botId}] Scan QRCode to log in:\n${consoleQRCode}`);
        } else {
          console.log(`[${botId}] on(scan) ${ScanStatus[status]}, ${status}`);
        }
      })
      .on("message", async (message: MessageInterface) => {
        console.log(`[${botId}] : ${i === yourBotNum ? message.toString() : "Received a message"}`);
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
