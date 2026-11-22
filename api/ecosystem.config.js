module.exports = {
  apps: [
    {
      name: "clinicyar-api",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      time: true,
      max_memory_restart: "500M",
      autorestart: true,
    },
  ],
};