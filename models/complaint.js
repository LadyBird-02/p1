// models/Complaint.js
const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  status: String,
  date: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  title: String,
  category: String,
  priority: String,
  description: String,
  status: String,
  updates: [updateSchema]
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);