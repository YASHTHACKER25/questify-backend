// DATABASE/functions/notificationservices.js
import Notification from "../models/notification.js";
import Question from "../models/question.js";
import Answer from "../models/answer.js";

/**
 * 🔔 When someone answers a question → notify the question owner
 */
export const createAnswerNotification = async (answerDoc) => {
  try {
    const question = await Question.findById(answerDoc.questionid).populate("userId", "_id username");
    if (!question || !question.userId) return;

    // Don’t notify if the answerer is the same person as the question owner
    if (question.userId._id.toString() === answerDoc.userId.toString()) return;

    await Notification.create({
      receiverId: question.userId._id,  // Question owner
      senderId: answerDoc.userId,       // Answerer
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
    console.log("🟢 [createCommentNotification] called with:", commentDoc);

    if (!commentDoc || !commentDoc.answerId) {
      console.warn("⚠️ Missing answerId in commentDoc:", commentDoc);
      return;
    }

    const answer = await Answer.findById(commentDoc.answerId)
      .populate("userId", "_id username")
      .populate("questionid", "content");

    if (!answer) {
      console.warn("⚠️ No answer found for answerId:", commentDoc.answerId);
      return;
    }

    console.log("📦 Populated answer found:", {
      answerId: answer._id,
      answerUser: answer.userId?._id,
      questionId: answer.questionid?._id,
      questionContent: answer.questionid?.content,
    });

    // Don’t notify if the commenter is the same as the answer owner
    if (answer.userId._id.toString() === commentDoc.userId.toString()) {
      console.log("⚠️ Skipping notification (user commented on own answer)");
      return;
    }

    const newNotif = await Notification.create({
      receiverId: answer.userId._id,
      senderId: commentDoc.userId,
      type: "comment",
      questionId: answer.questionid?._id,
      answerId: answer._id,
      message: `commented on your answer for "${answer.questionid?.content}"`,
    });

    console.log("✅ Comment notification created:", newNotif);
  } catch (error) {
    console.error("❌ Error creating comment notification:", error);
  }
};


/**
 * 🟢 Fetch notifications for a logged-in user
 */
export const getNotificationsByUser = async (userId) => {
  try {
    const raw = await Notification.find({ receiverId: userId })
      .populate("senderId", "_id username")
      .populate("questionId", "title")       // try populate question
      .sort({ createdAt: -1 });

    const result = [];

    for (const notifDoc of raw) {
      const n = notifDoc.toObject();
      
      // Normalize questionId (string or null)
      let q = n.questionId;
      let questionId =
        q && typeof q === "object"
          ? String(q._id ?? q.id)
          : q
          ? String(q)
          : null;

      // If questionId is missing → find from Answer
      if (!questionId && n.answerId) {
        const answer = await Answer.findById(n.answerId).select("questionid");
        if (answer) {
          questionId = String(answer.questionid);
        }
      }

      // Normalize answerId
      const a = n.answerId;
      const answerId =
        a && typeof a === "object" ? String(a._id ?? a.id) : a ? String(a) : null;

      // Get question title (if populated)
      const questionTitle =
        q && typeof q === "object" && q.title ? q.title : null;

      result.push({
        _id: String(n._id),
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
        isRead: !!n.isRead,

        // Always valid now:
        questionId,
        answerId,

        questionTitle,

        senderId:
          n.senderId && typeof n.senderId === "object"
            ? {
                _id: String(n.senderId._id),
                username: n.senderId.username,
              }
            : n.senderId,
      });
    }

    return result;
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

