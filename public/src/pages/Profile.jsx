import React, { useMemo, useState } from "react";
import { updateProfile } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, reviews, refreshUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [profilePicture, setProfilePicture] = useState(null);
  const [message, setMessage] = useState("");
  const initials = useMemo(() => user.name.split(" ").map((part) => part[0]).slice(0, 2).join(""), [user.name]);

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = new FormData();
    payload.append("name", name);
    if (profilePicture) payload.append("profilePicture", profilePicture);

    try {
      await updateProfile(payload);
      await refreshUser();
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  }

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

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Edit profile</h2>
              <p>Keep your public details up to date.</p>
            </div>
          </div>
          {message ? <div className="flash-message">{message}</div> : null}
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
                <strong>{review.reviewer?.name || "Passenger"}</strong>
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
