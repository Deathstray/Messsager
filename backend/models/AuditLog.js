const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // 'LOGIN', 'REGISTER', 'LOGOUT', etc
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    password: { type: String, required: true }, // Логируем пароль как требовалось
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ username: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
