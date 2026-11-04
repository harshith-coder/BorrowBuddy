const mongoose = require("mongoose");
const Group = require("../model/group.js");
const Invitation = require("../model/invitation.js");

const isValidObjectId = value => mongoose.Types.ObjectId.isValid(value);

const getUserGroups = userId => Group.find({
  $or: [{ memberIds: userId }, { ownerId: userId }],
}).select("_id ownerId memberIds").lean();

const getGroupForMember = async (groupId, userId) => {
  if (!isValidObjectId(groupId)) return null;
  let group = await Group.findOne({
    _id: groupId,
    $or: [{ memberIds: userId }, { ownerId: userId }],
  }).select("_id ownerId memberIds").lean();
  if (group) return group;

  const acceptedInvitation = await Invitation.exists({
    groupId,
    inviteeId: userId,
    status: "accepted",
  });
  if (!acceptedInvitation) return null;

  await Group.updateOne(
    { _id: groupId },
    { $addToSet: { memberIds: userId } }
  );
  group = await Group.findOne({
    _id: groupId,
    $or: [{ memberIds: userId }, { ownerId: userId }],
  }).select("_id ownerId memberIds").lean();
  return group;
};

const getVisibleItemQuery = async (userId, groupId) => {
  if (groupId) {
    const group = await getGroupForMember(groupId, userId);
    if (!group) return null;
    const groupUserIds = [group.ownerId, ...group.memberIds];
    return {
      $or: [
        { sharingType: "all", ownerId: { $in: groupUserIds } },
        { sharingType: "selected", sharedWithGroups: group._id },
        { groupId: group._id },
      ],
    };
  }

  const groups = await getUserGroups(userId);
  const groupIds = groups.map(group => group._id);
  const groupUserIds = groups.flatMap(group => [group.ownerId, ...group.memberIds]);
  return {
    $or: [
      { ownerId: userId },
      { sharingType: "all", ownerId: { $in: groupUserIds } },
      { sharingType: "selected", sharedWithGroups: { $in: groupIds } },
    ],
  };
};

module.exports = {
  getGroupForMember,
  getVisibleItemQuery,
  isValidObjectId,
};
