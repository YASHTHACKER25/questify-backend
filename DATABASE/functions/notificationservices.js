import Notification from "../models/notification.js";
import Question from "../models/question.js";
import Answer from "../models/answer.js";

/**
 * 🔔 When someone answers a question → notify the question owner
 */
export const createAnswerNotification = async (answerDoc) => {
  try {
    // Question model stores content in `content`
    const question = await Question.findById(answerDoc.questionid).populate(
      "userId",
      "_id username"
    );
    if (!question || !question.userId) return;

    // Don’t notify if the answerer is the same person as the question owner
    if (question.userId._id.toString() === answerDoc.userId.toString()) return;

    await Notification.create({
      receiverId: question.userId._id, // Question owner
      senderId: answerDoc.userId, // Answerer
      type: "answer",
      questionId: question._id,
      answerId: answerDoc._id,
      message: `answered your question "${question.content}"`,
    });
  } catch (error) {
    console.error("❌ Error creating answer notification:", error);
  }
};

/**
 * 🔔 When someone comments on an answer → notify the answer owner
 */
export const createCommentNotification = async (commentDoc) => {
  try {
    if (!commentDoc || !commentDoc.answerId) {
      console.warn("⚠️ Missing answerId in commentDoc:", commentDoc);
      return;
    }

    // Populate answer, its owner and its question (questionid)
    const answer = await Answer.findById(commentDoc.answerId)
      .populate("userId", "_id username")
      .populate("questionid", "content");

    if (!answer) {
      console.warn("⚠️ No answer found for answerId:", commentDoc.answerId);
      return;
    }

    // Don’t notify if the commenter is the same as the answer owner
    if (answer.userId && answer.userId._id.toString() === commentDoc.userId.toString()) {
      return;
    }

    // Ensure we set questionId on the notification using answer.questionid (if exists)
    const questionId = answer.questionid ? answer.questionid._id : null;

    const newNotif = await Notification.create({
      receiverId: answer.userId._id,
      senderId: commentDoc.userId,
      type: "comment",
      questionId: questionId,
      answerId: answer._id,
      message: `commented on your answer for "${answer.questionid?.content ?? ''}"`,
    });

    if (newNotif) {
      console.log("✅ Comment notification created:", newNotif);
    }
  } catch (error) {
    console.error("❌ Error creating comment notification:", error);
  }
};

/**
 * 🟢 Fetch notifications for a logged-in user
 *
 * Returns normalized notifications:
 * {
 *   _id,
 *   type,
 *   message,
 *   createdAt,
 *   isRead,
 *   questionId: string|null,
 *   answerId: string|null,
 *   questionTitle: string|null,   // uses Question.content
 *   senderId: { _id, username }|null
 * }
 */
export const getNotificationsByUser = async (userId) => {
  try {
    // Populate sender + question (content) + answer (and its questionid)
    const raw = await Notification.find({ receiverId: userId })
      .populate("senderId", "_id username")
      .populate("questionId", "content")
      .populate({
        path: "answerId",
        select: "_id questionid", // we only need to be able to find questionid if questionId missing
        populate: { path: "questionid", select: "content" },
      })
      .sort({ createdAt: -1 });

    const normalized = [];

    for (const doc of raw) {
      // Convert doc to plain object
      const n = doc && doc.toObject ? doc.toObject() : doc;

      // Normalize sender
      let sender = null;
      if (n.senderId) {
        if (typeof n.senderId === "object") {
          sender = {
            _id: String(n.senderId._id ?? n.senderId.id),
            username: n.senderId.username ?? null,
          };
        } else {
          // fallback: stored as id
          sender = { _id: String(n.senderId), username: null };
        }
      }

      // Normalize questionId (try populated questionId first)
      let questionId = null;
      let questionTitle = null;
      if (n.questionId) {
        if (typeof n.questionId === "object") {
          questionId = String(n.questionId._id ?? n.questionId.id);
          questionTitle = n.questionId.content ?? n.questionId.title ?? null;
        } else {
          questionId = String(n.questionId);
        }
      }

      // Normalize answerId
      let answerId = null;
      if (n.answerId) {
        if (typeof n.answerId === "object") {
          answerId = String(n.answerId._id ?? n.answerId.id);
          // If questionTitle is still missing, try answerId.questionid (populated above)
          if (!questionTitle && n.answerId.questionid && typeof n.answerId.questionid === "object") {
            questionTitle = n.answerId.questionid.content ?? null;
          }
        } else {
          answerId = String(n.answerId);
        }
      }

      // If questionId still missing but answerId exists, look up the answer to get questionid
      if (!questionId && answerId) {
        try {
          const answerDoc = await Answer.findById(answerId).select("questionid").populate("questionid", "content");
          if (answerDoc) {
            const q = answerDoc.questionid;
            if (q) {
              questionId = String(q._id ?? q.id);
              questionTitle = questionTitle ?? (q.content ?? null);
            }
          }
        } catch (err) {
          // ignore lookup error; we'll return notification without questionId
          console.warn("⚠️ Could not lookup answer to find questionId:", err);
        }
      }

      normalized.push({
        _id: String(n._id),
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
        isRead: !!n.isRead,
        questionId: questionId || null,
        answerId: answerId || null,
        questionTitle: questionTitle || null,
        senderId: sender,
      });
    } // end for

    return normalized;
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return [];
  }
};

/**
 * 🟢 Mark a notification as read
 */
export const markNotificationAsRead = async (id) => {
  try {
    return await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
  }
};
