// models/Test.js
import mongoose from "mongoose";

export default mongoose.model(
  "Test",
  (() => {
    const schema = new mongoose.Schema(
      {
        title: String,
        assignedTo: [String],
        startTime: Date,
        endTime: Date,
        durationSeconds: {
          type: Number,
          default: 600 // 10 minutes
        },
        rules: {
          enforceFullscreen: { type: Boolean, default: true },
          blockTabSwitch: { type: Boolean, default: true },
          requireCamera: { type: Boolean, default: false }
        },
        questions: [
          {
            text: String,
            options: [String]
          }
        ]
      },
      {
        timestamps: true
      }
    );

    schema.index({ createdAt: -1 });
    schema.index({ assignedTo: 1, createdAt: -1 });

    return schema;
  })()
);
