require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const { parseDuration, parseDateTime, fmtDate } = require("./util");

const {
  DISCORD_TOKEN,
  BACKLOG_CHANNEL_ID,
  LOG_CHANNEL_ID,
  STANDUP_CHANNEL_ID,
  PM_ROLE_ID,
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
client.once("ready", () => console.log(`🤖 Logged in as ${client.user.tag}`));

function isPMOrManager(inter) {
  const m = inter.member;
  if (!m) return false;
  if (PM_ROLE_ID && m.roles?.cache?.has(PM_ROLE_ID)) return true;
  return m.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

async function logEvent(lines) {
  if (!LOG_CHANNEL_ID) return;
  try {
    const ch = await client.channels.fetch(LOG_CHANNEL_ID);
    if (ch?.isTextBased()) await ch.send(lines.join("\\\\n"));
  } catch {}
}

// 可觀測：看得到誰用了哪個 slash
client.on("interactionCreate", async (i) => {
  if (i.isChatInputCommand()) {
    console.log(
      `[slash] /${i.commandName} by ${i.user.tag} in #${
        i.channel?.name || "DM"
      }`
    );
  }
  if (!i.isChatInputCommand()) return;

  try {
    // /task create
    if (i.commandName === "task" && i.options.getSubcommand() === "create") {
      if (!isPMOrManager(i))
        return i.reply({ content: "你沒有建立任務的權限。", ephemeral: true });
      const title = i.options.getString("title", true);
      const desc = i.options.getString("desc") || "（無描述）";
      const dueStr = i.options.getString("due");
      const due = dueStr ? parseDateTime(dueStr) : null;
      if (dueStr && !due)
        return i.reply({
          content: "時間格式錯誤，請用 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`。",
          ephemeral: true,
        });

      const backlog = await client.channels.fetch(BACKLOG_CHANNEL_ID);
      if (!backlog?.isTextBased() || backlog.type !== ChannelType.GuildText)
        return i.reply({
          content: "BACKLOG_CHANNEL_ID 非文字頻道。",
          ephemeral: true,
        });

      const embed = new EmbedBuilder()
        .setTitle(`🗂️ ${title}`)
        .setDescription(desc)
        .addFields(
          { name: "建立者", value: `<@${i.user.id}>`, inline: true },
          { name: "狀態", value: "Backlog", inline: true },
          ...(due ? [{ name: "截止", value: fmtDate(due), inline: true }] : [])
        )
        .setTimestamp(new Date());

      const msg = await backlog.send({ embeds: [embed] });
      const thread = await msg.startThread({
        name: due ? `[${title}] 截止: ${fmtDate(due)}` : `[${title}]`,
        autoArchiveDuration: 1440,
      });
      await i.reply({
        content: `✅ 任務已建立：<#${thread.id}>`,
        ephemeral: true,
      });
      await logEvent([
        `📝 建立任務：${title}`,
        `By：${i.user.tag}`,
        `Thread：#${thread.id}`,
      ]);
      return;
    }

    // /assign
    if (i.commandName === "assign") {
      if (!i.channel?.isThread())
        return i.reply({
          content: "請在任務 Thread 內使用。",
          ephemeral: true,
        });
      if (!isPMOrManager(i))
        return i.reply({ content: "你沒有指派權限。", ephemeral: true });
      const user = i.options.getUser("user", true);
      await i.channel.send(
        `👤 指派負責人：<@${user.id}>（由 <@${i.user.id}> 指派）`
      );
      await i.reply({
        content: `✅ 已指派給 <@${user.id}>。`,
        ephemeral: true,
      });
      await logEvent([
        `👤 指派：${i.channel.name}`,
        `Assignee：${user.tag}`,
        `By：${i.user.tag}`,
      ]);
      return;
    }

    // /deadline
    if (i.commandName === "deadline") {
      if (!i.channel?.isThread())
        return i.reply({
          content: "請在任務 Thread 內使用。",
          ephemeral: true,
        });
      if (!isPMOrManager(i))
        return i.reply({ content: "你沒有設定截止的權限。", ephemeral: true });
      const dateStr = i.options.getString("date", true);
      const d = parseDateTime(dateStr);
      if (!d)
        return i.reply({
          content: "時間格式錯誤，請用 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`。",
          ephemeral: true,
        });
      await i.channel.send(
        `⏰ 更新截止：**${fmtDate(d)}**（由 <@${i.user.id}> 設定）`
      );
      await i.reply({ content: "✅ 截止已更新。", ephemeral: true });
      await logEvent([
        `⏰ 截止：${i.channel.name}`,
        `Due：${fmtDate(d)}`,
        `By：${i.user.tag}`,
      ]);
      return;
    }

    // /standup
    if (i.commandName === "standup") {
      const ch = await client.channels.fetch(STANDUP_CHANNEL_ID);
      if (!ch?.isTextBased())
        return i.reply({
          content: "STANDUP_CHANNEL_ID 非文字頻道。",
          ephemeral: true,
        });
      const today = new Date().toISOString().slice(0, 10);
      await ch.send(
        [
          "📣 **Daily Standup – " + today + "**",
          "請依格式回覆本訊息或開 Thread：",
          "- 昨天完成：",
          "- 今天要做：",
          "- 卡點與需要協助：",
        ].join("\\\\n")
      );
      await i.reply({ content: "✅ 已發送站立會模板。", ephemeral: true });
      return;
    }

    // /remind
    if (i.commandName === "remind") {
      const ms = parseDuration(i.options.getString("in", true));
      const msg = i.options.getString("msg", true);
      if (!ms || ms < 1000)
        return i.reply({
          content: "延遲格式錯誤，請用 10m/2h/1d/1h 30m/90m。",
          ephemeral: true,
        });
      await i.reply({
        content: `🕒 我會在 **${i.options.getString("in")}** 後提醒你。`,
        ephemeral: true,
      });
      setTimeout(async () => {
        try {
          (await client.users.fetch(i.user.id)).send(`⏰ 提醒：${msg}`);
        } catch {
          await logEvent([`⚠️ DM 失敗（${i.user.tag}）`, `內容：${msg}`]);
        }
      }, ms);
      return;
    }
  } catch (err) {
    console.error(err);
    const msg = "❌ 指令執行錯誤，請稍後再試或聯絡管理員。";
    if (i.deferred || i.replied)
      await i.followUp({ content: msg, ephemeral: true }).catch(() => {});
    else await i.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
});

client.login(DISCORD_TOKEN);
