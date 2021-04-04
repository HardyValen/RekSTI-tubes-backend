const winston = require('winston');
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} -- [${level.toUpperCase()}] : ${message}`
})

const wLogger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  defaultMeta: {service: 'user-service'},
  transports: [
    new winston.transports.File({filename: 'logs/service-error.log', level: 'error'}),
    new winston.transports.File({filename: 'logs/service.log', level: 'info'})
  ],
});

module.exports = wLogger