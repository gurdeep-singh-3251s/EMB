/** PM2 process file — self-host ExtractPilot API + worker on this VPS. */
module.exports = {
  apps: [
    {
      name: "extractpilot-api",
      cwd: "/home/ubuntu/projects/EMB/extractpilot-backend",
      script: "/home/ubuntu/.bun/bin/bun",
      args: "run --env-file=.env src/index.ts",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "800M",
      time: true,
    },
  ],
};
