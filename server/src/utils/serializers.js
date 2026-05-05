function buildPictureUrl(rawUrl) {
  if (!rawUrl) return "";
  // If it's already a full URL (like Google profile pic), return it as is
  if (rawUrl.startsWith("http")) return rawUrl;
  return rawUrl; // Otherwise return the path (assuming it's a relative path or Cloudinary ID that frontend handles)
}

function toUserProfile(user) {
  if (!user) return null;

  // Use profilePictureUrl with a fallback to profilePic for older accounts
  const rawPic = user.profilePictureUrl || user.profilePic || "";

  return {
    id: user.publicId,
    name: user.name,
    email: user.email,
    profilePictureUrl: buildPictureUrl(rawPic),
    joinedAt: user.joinedAt,
    totalRidesParticipated: user.totalRidesParticipated || 0,
    ratings: {
      average: Number(user.ratings?.average || 0),
      count: Number(user.ratings?.count || 0),
    },
    isAdmin: Boolean(user.isAdmin),
  };
}

function toRideCard(ride, currentUser) {
  if (!ride) return null;

  const currentUserId = typeof currentUser === "string" ? currentUser : currentUser?.publicId;
  const currentUserMongoId = currentUser?.id || currentUser?._id;

  const creator = ride.creator || {};
  const creatorPublicId = creator.publicId || (typeof creator === "string" ? creator : null);
  const creatorMongoId = creator._id || creator.id || (typeof creator === "string" ? creator : null);

  const isOwner = (currentUserId && creatorPublicId === currentUserId) || 
                  (currentUserMongoId && creatorMongoId === currentUserMongoId);
  const passengers = Array.isArray(ride.passengers) ? ride.passengers : [];
  const hasBooked = passengers.some((passenger) => {
    const pUser = passenger.user || {};
    const pPublicId = pUser.publicId || (typeof pUser === "string" ? pUser : null);
    const pMongoId = pUser._id || pUser.id || (typeof pUser === "string" ? pUser : null);
    
    return (currentUserId && pPublicId === currentUserId) || 
           (currentUserMongoId && pMongoId === currentUserMongoId);
  });

  const filteredPassengers = passengers.filter((passenger) => {
    if (isOwner) return true;
    const pUser = passenger.user || {};
    const pPublicId = pUser.publicId || (typeof pUser === "string" ? pUser : null);
    const pMongoId = pUser._id || pUser.id || (typeof pUser === "string" ? pUser : null);
    return (currentUserId && pPublicId === currentUserId) || 
           (currentUserMongoId && pMongoId === currentUserMongoId);
  });

  return {
    id: ride.publicId,
    source: ride.source,
    destination: ride.destination,
    departureTime: ride.departureTime,
    totalSeats: ride.totalSeats,
    availableSeats: ride.availableSeats,
    price: ride.price,
    status: ride.status,
    description: ride.description || "",
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
    creator: creator.publicId
      ? {
          id: creator.publicId,
          name: creator.name,
          profilePictureUrl: buildPictureUrl(creator.profilePictureUrl || creator.profilePic || ""),
          ratings: {
            average: Number(creator.ratings?.average || 0),
            count: Number(creator.ratings?.count || 0),
          },
        }
      : null,
    passengerCount: passengers.reduce((sum, passenger) => sum + Number(passenger.seats || 0), 0),
    passengers: filteredPassengers.map((passenger) => ({
      id: passenger.publicId,
      seats: passenger.seats,
      status: passenger.status,
      user: passenger.user
        ? {
            id: passenger.user.publicId,
            name: passenger.user.name,
            email: passenger.user.email,
            profilePictureUrl: buildPictureUrl(passenger.user.profilePictureUrl || passenger.user.profilePic || ""),
          }
        : null,
      permissions: {
        canAccept: isOwner && passenger.status === "Pending",
        canReject: isOwner && passenger.status === "Pending",
        canCancel: (isOwner || 
                   (passenger.user && (
                     (currentUserId && passenger.user.publicId === currentUserId) || 
                     (currentUserMongoId && (passenger.user._id === currentUserMongoId || passenger.user.id === currentUserMongoId))
                   ))) && ["Pending", "Accepted"].includes(passenger.status),
      },
    })),
    permissions: {
      canEdit: isOwner && !["Completed", "Cancelled"].includes(ride.status),
      canDelete: isOwner,
      canComplete: isOwner && 
                   !["Completed", "Cancelled"].includes(ride.status) && 
                   passengers.some(p => p.status === "Accepted"),
      hasBooked,
      canBook:
        Boolean(currentUserId) &&
        !isOwner &&
        !["Completed", "Cancelled"].includes(ride.status) &&
        ride.availableSeats > 0 &&
        !hasBooked,
    },
  };
}

function toBooking(booking) {
  if (!booking) return null;

  return {
    id: booking.publicId,
    seats: booking.seats,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    ride: booking.ride
      ? {
          id: booking.ride.publicId,
          source: booking.ride.source,
          destination: booking.ride.destination,
          departureTime: booking.ride.departureTime,
          status: booking.ride.status,
          availableSeats: booking.ride.availableSeats,
          price: booking.ride.price,
          creator: booking.ride.creator
            ? {
                id: booking.ride.creator.publicId,
                name: booking.ride.creator.name,
                email: booking.ride.creator.email,
              }
            : null,
        }
      : null,
    user: booking.user
      ? {
          id: booking.user.publicId,
          name: booking.user.name,
          email: booking.user.email,
          profilePictureUrl: buildPictureUrl(booking.user.profilePictureUrl || booking.user.profilePic || ""),
        }
      : null,
  };
}

function toReview(review) {
  if (!review) return null;

  return {
    id: review.publicId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    reviewer: review.reviewer
      ? {
          id: review.reviewer.publicId,
          name: review.reviewer.name,
          profilePictureUrl: buildPictureUrl(review.reviewer.profilePictureUrl),
        }
      : null,
  };
}

function toNotification(notification) {
  if (!notification) return null;

  return {
    id: notification.publicId,
    type: notification.type,
    message: notification.message,
    metadata: notification.metadata || {},
    createdAt: notification.createdAt,
    readAt: notification.readAt,
  };
}

module.exports = {
  toBooking,
  toNotification,
  toReview,
  toRideCard,
  toUserProfile,
};
