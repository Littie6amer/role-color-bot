import { Client, GatewayIntentBits, AttachmentBuilder } from "discord.js"
import { config } from "dotenv"
config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
})

let prefix = "??"

client.on("ready", (c) => {
    console.log(`Ready?! I am ${c.user.tag} / ${c.user.username}`)
})

const userId = process.env["USER_ID"]

client.on("messageCreate", async (m) => {
    if (!m.guild || m.author.bot || m.author.system || !m.content.startsWith(`<@${client.user!.id}>`)) return

    // Checking that they have permission to run a command.
    if (userId == undefined || userId === "0") {
        if (!m.member!.permissions.has("ManageGuild")) return
    } else
        if (m.author.id !== userId) return

    const args = m.content.slice(`<@${client.user!.id}}>`.length).split(" ")
    if (!args.length) return

    if (!args[0].length) args.shift()
    const command = args.shift()?.toLowerCase()

    if (command == "save") {
        const roleObj: Record<string, number> = {}
        for (const [_, role] of m.guild.roles.cache) {
            roleObj[role.id] = role.color
        }
        const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(roleObj, null, 4)), {
            name: 'role-colors.json'
        });
        return await m.reply({ files: [attachment] }).catch(() => null)
    }

    if (command == "load") {
        const selfMember = await m.guild.members.fetchMe()
        if (!selfMember.permissions.has("ManageRoles"))
            return await m.reply("I don't have permission to manage roles").catch(() => null)
        if (!m.attachments.size)
            return await m.reply("Maybe try attaching a json file with role colors like:\n```json\n{\n   \"123\": 123\n}```").catch(() => null)
        const attachment = m.attachments.first()!
        if (attachment.size > 50_000) // comment this out to remove size limit to files, this will leave the bot vulnerable to people using it to download files that are way too large
            return await m.reply("The file is too big. If this is unexpected, please contact `@littie`\nor you can self host this bot using the code [here](https://github.com/Littie6amer/role-color-bot) and increase/remove the size limit").catch(() => null)
        if (!args.length || args.join(" ").toLowerCase() != "yes i am sure")
            return await m.reply("Are you sure? Confirm with `@me load yes i am sure` with the file attached").catch(() => null)

        const data = await fetch(attachment.url).then(async r => await r.json()).catch(() => null)
        if (data === null)
            return await m.reply("### I was unable to get the file data.\nIf this is unexpected, please contact `@littie`").catch(() => null)

        const errors = []
        const myHighestRolePosition = selfMember.roles.highest.position
        let sucessNum = 0
        for (const roleId in data) {
            if (Number.isNaN(roleId)) {
                errors.push(`${roleId}: Not a role`)
                continue
            }
            const value = data[roleId]
            if (!Number.isInteger(value) || value < 0x0 || value > 0xFFFFFF) {
                errors.push(`${roleId}: Not a color`)
                continue
            }
            const role = m.guild.roles.cache.get(roleId)
            if (!role) {
                errors.push(`${roleId}: Not a role`)
                continue
            }
            if (role.position >= myHighestRolePosition) {
                errors.push(`${roleId} / ${role.name}: Higher than my highest role, cannot set role color!`)
                continue
            }
            if (role.color !== value)
                role.setColor(value)
            sucessNum++
        }
        if (errors.length) {
            const attachment = new AttachmentBuilder(Buffer.from(errors.join("\n")), {
                name: 'errors.txt'
            });
            return m.reply({
                content: `${errors.length} failed, ${sucessNum} succeeded.`,
                files: [attachment]
            })
        }
        return m.reply("All role colors successfully set!")
    }

    if (command == "help") {
        return m.reply("### There are 2 commands:\n`save` - Save role colours to a JSON file sent by bot.\n`load` - Load role colours from a JSON file.\nGithub: https://github.com/Littie6amer/role-color-bot")
    }

    return await m.reply({ content: "Not a command." }).catch(() => null)
})

client.login(process.env["BOT_TOKEN"])