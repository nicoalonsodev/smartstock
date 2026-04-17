import * as Joi from 'joi';

/**
 * Strict env validation at bootstrap (NB-ARC-002).
 * NODE_ENV: development | staging | production | test
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'dev', 'staging', 'production', 'prod', 'test')
    .default('development'),

  PORT: Joi.number().integer().min(1).max(65535).default(4000),

  DB_HOST: Joi.string().trim().min(1).required().messages({
    'any.required': 'DB_HOST is required (set in .env or .env.local)',
    'string.empty': 'DB_HOST cannot be empty',
  }),
  DB_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  DB_USER: Joi.string().trim().min(1).required().messages({
    'any.required': 'DB_USER is required',
    'string.empty': 'DB_USER cannot be empty',
  }),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().trim().min(1).required().messages({
    'any.required': 'DB_NAME is required',
    'string.empty': 'DB_NAME cannot be empty',
  }),
  DB_SSL: Joi.string().valid('true', 'false', '1', '0').default('false'),
  DB_LOGGING: Joi.string().valid('true', 'false', '1', '0').default('false'),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent')
    .default('info'),
}).unknown(true);
