// Created By Fabian Becerra
// Mail: fabian.becerra@runcode.co
// Company: Runcode Ingeniería SAS
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor ingrese el nombre']
  },
  description: String,
  users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
  ],
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

roleSchema.pre(/^find/, function(next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
