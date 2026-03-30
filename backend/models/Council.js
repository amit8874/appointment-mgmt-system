import mongoose from 'mongoose';

const councilSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

export default mongoose.model('Council', councilSchema);
