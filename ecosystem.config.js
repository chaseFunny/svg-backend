module.exports = {
    apps: [
        {
            name: "svg-backend", // 应用程序名称，用于PM2识别和管理
            script: "dist/server.js", // 启动脚本路径，指向编译后的服务器入口文件
            instances: "max", // 启动的实例数量，'max'表示根据CPU核心数自动创建实例数
            exec_mode: "cluster", // 执行模式，'cluster'模式允许多个实例共享同一端口
            watch: false, // 是否监视文件变化并自动重启，生产环境建议设为false
            ignore_watch: ["node_modules", "logs"], // 忽略监视的文件夹
            max_memory_restart: "1G", // 当内存超过1G时自动重启应用
            env: {
                NODE_ENV: "production", // 设置环境变量为生产环境
                API_PORT: 3001, // 设置应用程序端口为3001
            },
            env_development: {
                NODE_ENV: "development", // 开发环境配置
                API_PORT: 3001, // 开发环境也使用3001端口
            },
            log_date_format: "YYYY-MM-DD HH:mm:ss", // 日志日期格式
            error_file: "logs/error.log", // 错误日志文件路径
            out_file: "logs/output.log", // 标准输出日志文件路径
            merge_logs: true, // 合并集群模式下的日志
            log_type: "json", // 日志类型，使用JSON格式便于解析
            max_restarts: 10, // 最大重启次数
            restart_delay: 3000, // 重启延迟时间（毫秒）
            autorestart: true, // 应用崩溃时自动重启
            node_args: "--max-old-space-size=1024", // Node.js参数，限制内存使用
            time: true, // 在日志中添加时间戳
        },
    ],

    // 部署配置，如果需要自动部署可以取消注释并配置
    /*
  deploy: {
    production: {
      user: 'username', // 服务器用户名
      host: 'server-ip', // 服务器IP地址
      ref: 'origin/main', // Git分支
      repo: 'git@github.com:username/repo.git', // Git仓库地址
      path: '/var/www/production', // 服务器上的部署路径
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production', // 部署后执行的命令
    },
  },
  */
};
