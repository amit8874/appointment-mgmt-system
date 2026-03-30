import mongoose from 'mongoose';

const specializationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

export default mongoose.model('Specialization', specializationSchema);
