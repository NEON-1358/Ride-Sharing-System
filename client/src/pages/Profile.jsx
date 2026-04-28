import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { updateProfile, getProfile } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, reviews: currentReviews, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);

  const isOwnProfile = !userId || userId === currentUser?.id;

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        if (isOwnProfile && currentUser) {
          setProfileData({ user: currentUser, reviews: currentReviews });
          setName(currentUser.name);
        } else if (userId) {
          const data = await getProfile(userId);
          setProfileData(data);
          setName(data.user.name);
        }
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId, currentUser, currentReviews, isOwnProfile]);

  const initials = useMemo(() => {
    if (!profileData?.user?.name) return "";
    return profileData.user.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  }, [profileData?.user?.name]);

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = new FormData();
    payload.append("name", name);
    if (profilePicture) payload.append("profilePicture", profilePicture);

    try {
      await updateProfile(payload);
      await refreshUser();
      showToast("Profile updated successfully.");
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  if (loading) return <div className="page-shell"><p>Loading profile...</p></div>;
  if (!profileData) return <div className="page-shell"><p>Profile not found.</p></div>;

  const { user, reviews } = profileData;

  return (
    <div className="page-shell">
      <section className="content-grid profile-grid">
        <div className="panel profile-summary">
          <div className="avatar-wrap">
            {user.profilePictureUrl ? <img src={user.profilePictureUrl} alt={user.name} className="avatar-image" /> : <div className="avatar-fallback">{initials}</div>}
          </div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <div className="profile-stats">
            <div><span>Joined</span><strong>{new Date(user.joinedAt).toLocaleDateString()}</strong></div>
            <div><span>Total rides</span><strong>{user.totalRidesParticipated}</strong></div>
            <div><span>Rating</span><strong>{user.ratings.average.toFixed(1)} ({user.ratings.count})</strong></div>
          </div>
        </div>

        {isOwnProfile && (
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Edit profile</h2>
                <p>Keep your public details up to date.</p>
              </div>
            </div>
            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span>Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label>
                <span>New profile picture</span>
                <input type="file" accept="image/*" onChange={(event) => setProfilePicture(event.target.files?.[0] || null)} />
              </label>
              <button type="submit" className="solid-button">Save changes</button>
            </form>
          </div>
        )}
      </section>


      <section className="panel review-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent reviews</h2>
            <p>Feedback left by passengers after completed trips.</p>
          </div>
        </div>
        <div className="review-list">
          {reviews.length === 0 ? <p className="muted-text">No reviews yet.</p> : null}
          {reviews.map((review) => (
            <article key={review.id} className="review-item">
              <div className="review-row">
                <Link to={`/profile/${review.reviewer?.id}`} className="user-link">
                  <strong>{review.reviewer?.name || "Passenger"}</strong>
                </Link>
                <span>{review.rating} / 5</span>
              </div>
              <p>{review.comment || "No comment provided."}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
