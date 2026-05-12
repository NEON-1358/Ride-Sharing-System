import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { updateProfile, getProfile, deleteProfile } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, reviews: currentReviews, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    
    if (password) {
      if (password.length < 8) return showToast("Password must be at least 8 characters.", "error");
      if (password !== confirmPassword) return showToast("Passwords do not match.", "error");
    }

    const payload = new FormData();
    payload.append("name", name);
    if (password) payload.append("password", password);
    if (profilePicture) payload.append("profilePicture", profilePicture);

    setIsUpdating(true);
    try {
      await updateProfile(payload);
      await refreshUser();
      setPassword("");
      setConfirmPassword("");
      showToast("Profile updated successfully.");
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteProfile() {
    if (!window.confirm("Are you sure you want to delete your profile? This action cannot be undone!")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProfile();
      logout();
      navigate("/");
      showToast("Profile deleted successfully.");
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsDeleting(false);
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
            {user.profilePictureUrl ? (
              <img 
                src={user.profilePictureUrl} 
                alt={user.name} 
                className="avatar-image" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="avatar-fallback">{initials}</div>
            )}
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
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              
              <div className="divider" style={{ margin: '1rem 0', borderBottom: '1px solid var(--line)' }}></div>
              <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Change Password (Optional)</p>
              
              <label>
                <span>New Password</span>
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(event) => setPassword(event.target.value)} 
                    placeholder="Leave blank to keep current"
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </label>
              
              {password && (
                <label>
                  <span>Confirm New Password</span>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(event) => setConfirmPassword(event.target.value)} 
                  />
                </label>
              )}

              <label>
                <span>Profile picture</span>
                <input type="file" accept="image/*" onChange={(event) => setProfilePicture(event.target.files?.[0] || null)} />
              </label>
              <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="solid-button" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Save changes"}
                </button>
                <button 
                  type="button" 
                  className="ghost-button" 
                  style={{ color: 'var(--danger)' }} 
                  onClick={handleDeleteProfile}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete profile"}
                </button>
              </div>
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
