# CLI Chat

## Quick Start

Requirement
- Nodejs
- NPM

Install dependencies
```console
npm i
```

To start, simply run
```console
npm start
```

*Tip: type `help` to view available commands*

## Examples

```console
...
[bot0] on(message): Message#Audio[🗣Contact<felix>]
[bot0] on(message): Message#Audio[🗣Contact<felix>]
[bot0] on(message): Message#Text[🗣Contact<felix>] You free?
[bot0] on(message): Message#Text[🗣Contact<David>] bro
[bot0] on(message): Message#Text[🗣Contact<David>] wish me luck
[bot0] on(message): Message#Text[🗣Contact<David>] im going to the exam
[bot0] on(message): Message#Image[🗣Contact<abc>@👥Room<xxx🧧yyyy>]
bot0> help send
Usage: send <target> -t <room|contact> -m <message>
bot0> help ls
Usage: ls [--contact | -c | --room | -r]
[bot0] on(message): Message#Image[🗣Contact<gaga>@👥Room<yyyyyyyyy🏋️>]
bot0> help search
Usage: search <pattern> [-t | --targetType <room|contact>]
bot0> help
Usage: help <command>
Available commands:
send
ls
search
bot0> help ls
Usage: ls [--contact | -c | --room | -r]
[bot0] on(message): Message#Image[🗣Contact<xxxxx>@👥Room<yyyyyyyy🏋️>]
[bot0] on(message): Message#Image[🗣Contact<xxxxxx>@👥Room<carpool>]
bot0> search .*
Searching contacts using \.\* ...
No matching contacts found :(
Searching rooms using \.\* ...
No matching rooms found :(
bot0> search /.*ad.*/
Searching contacts using .*ad.* ...
- Matched Contacts:
┌─────────┬───────────────────────────────────────┬─────────────────────────────────────────────┬────────────────────────────────────┐
│ (index) │ id                                    │ alias                                       │ name                               │
├─────────┼───────────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ 0       │ '@0b11650f9f44e796a24f34666a047df...' │ ''                                          │ 'Axxxxxxxxxxxxxxxx'                │
│ 1       │ '@76a0598ca64b17eaf7786136e7b8511c'   │ ''                                          │ 'Aboutxxxxxxxxxx'                  │
│ 2       │ '@3c9c67b9df26e59169679f114bddcde...' │ 'Abyss'                                     │ '🥛'                               │
│ 3       │ '@38f9b64819eaec80042d1b6bc83820e...' │ ''                                          │ 'A+xxxxx'                          │
│ 4       │ '@aef7ddfe51609864334701d8276e275b'   │ ''                                          │ 'Adam'                             │
│ 5       │ '@f4bfc09d32378a350f83d55720b5eba...' │ ''                                          │ 'xxxxx&α'                          │
│ ...     │ '@f4bfc09d32378a350f83d55720b5eba...' │ '...'                                       │ .........                          │
│ 907     │ '@355314b74edf6e09c1847e63efee8c0d'   │ ''                                          │ 'xxxxxxxxxxkisxxxke05'             │
│ 908     │ '@6736b4b78549aa063889ede0d768e7c...' │ ''                                          │ 'xxxxxxxxxxxxxxxxxxxxx'            │
│ 909     │ '@a0df937936f06620cf6dad4e950f8dd...' │ ''                                          │ '8090 Social Lounge'               │
└─────────┴───────────────────────────────────────┴─────────────────────────────────────────────┴────────────────────────────────────┘
Searching rooms using .*ad.* ...
- Matched Rooms:
┌─────────┬───────────────────────────────────────┬──────────────────────────────────┐
│ (index) │ id                                    │ topic                            │
├─────────┼───────────────────────────────────────┼──────────────────────────────────┤
│ 0       │ '@@515dcb8d7f40c32edb5dfc459a0d26...' │ 'xxxxxxxxxxxxxxxxxxxxx'          │
│ 1       │ '@@d46fc7f75826473d70b068d8a5467a...' │ 'Asadfadfa'                      │
│ 2       │ '@@01668efdb43a45a2c12a306aa0a27f...' │ 'BSaaaaaaaa'                     │
│ 3       │ '@@03b1808f14570eaa7a3bf5e53a907c...' │ 'bbbbbb'                         │
│ 4       │ '@@842ace2a07fdcb1d87377ead5151d0...' │ 'ccccccccccc🏋️'                  │
│ 5       │ '@@ceef5d0f6de930c1093b62af4bf01e...' │ 'ddddddddddddd'                  │
│ ...     │ '@@61c92da44a27494fac642778155b57...' │ '...'                            │
│ 49      │ '@@6f55b91e80c931dda9003c13960388...' │ 'fffffffffffffff'                │
└─────────┴───────────────────────────────────────┴──────────────────────────────────┘
bot0> send "Adam Smith" -t contact -m "do you wanna play overwatch tonight?"
Message sent to contact "Adam Smith": do you wanna play overwatch tonight?
[bot0] on(message): Message#Text[🗣Contact<me>]  do you wanna play overwatch tonight?
...
```