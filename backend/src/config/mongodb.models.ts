import { Schema, model, InferSchemaType } from "mongoose";

// Flexible/document-oriented data lives in MongoDB.
// Postgres is the source of truth for transactional data.

// AI analysis results (future: image quality grading etc.)
const aiAnalysisSchema = new Schema(
  {
    kind: { type: String, required: true }, // price-recommendation | quality-assessment | ...
    refId: { type: String }, // bid/contract id if relevant
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    model: { type: String },
    confidence: { type: Number },
  },
  { timestamps: true }
);

// Event/activity stream (analytics - not authoritative)
const activityEventSchema = new Schema(
  {
    actorId: { type: String },
    actorRole: { type: String },
    type: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: String },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Notification payloads (durable log besides FCM push)
const notificationPayloadSchema = new Schema(
  {
    userId: { type: String, index: true },
    type: { type: String },
    title: { type: String },
    body: { type: String },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    sentAt: { type: Date },
    deliveryStatus: { type: String, default: "pending" },
  },
  { timestamps: true }
);

// Chat history with AI assistant
const chatSessionSchema = new Schema(
  {
    userId: { type: String, index: true },
    messages: [
      {
        role: { type: String }, // user | assistant
        text: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Bid snapshots at time of allocation (for audit of recommendations)
const allocationSnapshotSchema = new Schema(
  {
    procurementId: { type: String, index: true },
    weights: { type: Schema.Types.Mixed },
    rankedBids: { type: Schema.Types.Mixed },
    recommendedBids: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AiAnalysis = model("AiAnalysis", aiAnalysisSchema);
export const ActivityEvent = model("ActivityEvent", activityEventSchema);
export const NotificationPayload = model("NotificationPayload", notificationPayloadSchema);
export const ChatSession = model("ChatSession", chatSessionSchema);
export const AllocationSnapshot = model("AllocationSnapshot", allocationSnapshotSchema);

export type AiAnalysisDoc = InferSchemaType<typeof aiAnalysisSchema>;
