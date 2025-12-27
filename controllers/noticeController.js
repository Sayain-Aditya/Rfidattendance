import Notice from "../models/Notice.js";

export const createNotice = async (req, res) => {
  try {
    const { title, content, priority, createdBy } = req.body;

    const notice = await Notice.create({
      title,
      content,
      priority,
      createdBy
    });

    res.json({
      success: true,
      message: "Notice created successfully",
      notice
    });
  } catch (error) {
    console.error("❌ Create Notice Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notice"
    });
  }
};

export const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .populate("createdBy", "name")
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      notices
    });
  } catch (error) {
    console.error("❌ Get Notices Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notices"
    });
  }
};

export const updateNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { title, content, priority, isActive } = req.body;

    const notice = await Notice.findByIdAndUpdate(
      noticeId,
      { title, content, priority, isActive },
      { new: true }
    );

    res.json({
      success: true,
      message: "Notice updated successfully",
      notice
    });
  } catch (error) {
    console.error("❌ Update Notice Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notice"
    });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;

    await Notice.findByIdAndUpdate(noticeId, { isActive: false });

    res.json({
      success: true,
      message: "Notice deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete Notice Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notice"
    });
  }
};