// models/BlogFAQ.js
import mongoose from 'mongoose';

const BlogFAQSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true,
    index: true,
  },
  blogSlug: {
    type: String,
    required: true,
    index: true,
  },
  questions: [
    {
      question: {
        type: String,
        required: true,
      },
      answer: {
        type: String,
        required: true,
      },
      order: {
        type: Number,
        default: 0,
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.BlogFAQ || mongoose.model('BlogFAQ', BlogFAQSchema);
