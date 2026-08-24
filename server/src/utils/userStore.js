const { v4: uuidv4 } = require("uuid");

const usersByEmail = new Map();
const usersByPublicId = new Map();
const usersById = new Map();

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function toSerializableUser(input) {
  const now = new Date();
  return {
    _id: input._id || uuidv4(),
    publicId: input.publicId || uuidv4(),
    name: input.name || "",
    email: normalizeEmail(input.email),
    passwordHash: input.passwordHash || null,
    googleId: input.googleId || null,
    profilePictureUrl: input.profilePictureUrl || "",
    profilePic: input.profilePic || input.profilePictureUrl || "",
    joinedAt: input.joinedAt || now,
    totalRidesParticipated: Number(input.totalRidesParticipated || 0),
    ratings: {
      average: Number(input.ratings?.average || 0),
      count: Number(input.ratings?.count || 0),
    },
    isAdmin: Boolean(input.isAdmin),
    role: input.role || "Client",
    password: input.password || null,
    chattiness: input.chattiness || "BlaBla",
    emailVerified: Boolean(input.emailVerified),
    phoneVerified: Boolean(input.phoneVerified),
    govIdVerified: Boolean(input.govIdVerified),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function indexUser(user) {
  usersByEmail.set(user.email, user);
  usersByPublicId.set(user.publicId, user);
  usersById.set(user._id, user);
}

function reindexUser(user) {
  usersByEmail.delete(normalizeEmail(user.email));
  usersByEmail.set(user.email, user);
  usersByPublicId.set(user.publicId, user);
  usersById.set(user._id, user);
}

async function createUser(input) {
  const user = toSerializableUser(input);
  indexUser(user);
  return user;
}

async function findByEmail(email) {
  const normalized = normalizeEmail(email);
  const user = usersByEmail.get(normalized);
  return user ? { ...user } : null;
}

async function findByPublicId(publicId) {
  const user = usersByPublicId.get(publicId);
  return user ? { ...user } : null;
}

async function findById(id) {
  const user = usersById.get(id) || usersByPublicId.get(id);
  return user ? { ...user } : null;
}

async function updateUser(publicId, update) {
  const existing = usersByPublicId.get(publicId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...update,
    updatedAt: new Date(),
    ratings: {
      average: Number(update.ratings?.average ?? existing.ratings?.average ?? 0),
      count: Number(update.ratings?.count ?? existing.ratings?.count ?? 0),
    },
  };

  if (updated.email) {
    updated.email = normalizeEmail(updated.email);
  }

  usersByEmail.delete(normalizeEmail(existing.email));
  usersByPublicId.set(updated.publicId, updated);
  usersById.set(updated._id, updated);
  usersByEmail.set(updated.email, updated);
  return updated;
}

async function deleteUser(publicId) {
  const existing = usersByPublicId.get(publicId);
  if (!existing) return null;

  usersByEmail.delete(normalizeEmail(existing.email));
  usersByPublicId.delete(existing.publicId);
  usersById.delete(existing._id);
  return existing;
}

function resetUserStore() {
  usersByEmail.clear();
  usersByPublicId.clear();
  usersById.clear();
}

module.exports = {
  createUser,
  findByEmail,
  findByPublicId,
  findById,
  updateUser,
  deleteUser,
  resetUserStore,
};
