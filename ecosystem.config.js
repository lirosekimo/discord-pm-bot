module.exports = {
  apps: [
    {
      name: "discord-pm-bot",
      script: "src/index.js",
      env_file: ".env",
      env: { NODE_ENV: "production" },
      max_memory_restart: "300M",
      autorestart: true,
    },
  ],
};
