const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("task")
    .setDescription("Task operations")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a task")
        .addStringOption((o) =>
          o.setName("title").setDescription("Title").setRequired(true)
        )
        .addStringOption((o) => o.setName("desc").setDescription("Description"))
        .addStringOption((o) =>
          o.setName("due").setDescription("YYYY-MM-DD 或 YYYY-MM-DD HH:mm")
        )
    ),
  new SlashCommandBuilder()
    .setName("assign")
    .setDescription("Assign current task thread")
    .addUserOption((o) =>
      o.setName("user").setDescription("Assignee").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("deadline")
    .setDescription("Set/update deadline on current task thread")
    .addStringOption((o) =>
      o
        .setName("date")
        .setDescription("YYYY-MM-DD 或 YYYY-MM-DD HH:mm")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("standup")
    .setDescription("Post a standup template to #standup-daily"),
  new SlashCommandBuilder()
    .setName("remind")
    .setDescription("DM a delayed reminder to yourself")
    .addStringOption((o) =>
      o
        .setName("in")
        .setDescription("10m / 2h / 1d / 1h 30m / 90m")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("msg").setDescription("Message").setRequired(true)
    ),
].map((c) => c.toJSON());

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENT_ID,
      process.env.DISCORD_GUILD_ID
    ),
    { body: commands }
  );
  console.log("✅ Slash commands registered to guild");
})();
