/**
 * middleware/validate.js
 * ─────────────────────────────────────────────────────────
 * Joi schemas + middleware for validating request bodies.
 */

const Joi = require('joi');

// ── Schemas ───────────────────────────────────────────────────────────────

const patientSchema = Joi.object({
  name:           Joi.string().max(120).default('Anonymous'),
  mrn:            Joi.string().max(50).allow('').default(''),
  age:            Joi.number().integer().min(1).max(120),
  gender:         Joi.string().valid('female','male','other','not_specified').default('not_specified'),
  referralReason: Joi.string().max(500).allow(''),
  medicalHistory: Joi.string().max(1000).allow(''),
  notes:          Joi.string().max(2000).allow(''),
});

const scanUpdateSchema = Joi.object({
  reviewed:   Joi.boolean(),
  reviewNote: Joi.string().max(500).allow(''),
  clinicalNotes: Joi.string().max(2000).allow(''),
});

const querySchema = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  limit:          Joi.number().integer().min(1).max(100).default(20),
  classification: Joi.string().valid('cancer','non-cancer','all').default('all'),
  riskLevel:      Joi.string().valid('High Risk','Moderate Risk','Low Risk','all').default('all'),
  demoMode:       Joi.string().valid('true','false','all').default('all'),
  search:         Joi.string().max(100).allow('').default(''),
  sortBy:         Joi.string().valid('createdAt','probability','riskLevel').default('createdAt'),
  sortOrder:      Joi.string().valid('asc','desc').default('desc'),
});

// ── Middleware factory ────────────────────────────────────────────────────

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly:   false,
      allowUnknown: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    req[source] = value;
    next();
  };
}

module.exports = { validate, patientSchema, scanUpdateSchema, querySchema };
