"use client";

import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  updateOwnProfile,
  type ProfileActionState,
} from "../../../app/me/actions";
import { ProfileAvatar, type ProfileAvatarData } from "../profiles/avatar";
import { Dialog } from "../ui/overlays";
import { Button, Field, Input, Textarea } from "../ui/primitives";
import { toast } from "../ui/toaster";

type UploadedAvatar = NonNullable<ProfileAvatarData> & {
  id: string;
  bytes: number;
};

const initialState: ProfileActionState = {
  status: "idle",
  message: "",
};

function ProfileForm({
  name,
  username,
  avatar,
  bio,
  instagramUrl,
  youtubeUrl,
  onCancel,
  onSuccess,
}: {
  name: string;
  username: string;
  avatar: ProfileAvatarData;
  bio: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateOwnProfile,
    initialState,
  );
  const [uploaded, setUploaded] = useState<UploadedAvatar | null>(null);
  const [displayName, setDisplayName] = useState(name);
  const [handle, setHandle] = useState(username);
  const [profileBio, setProfileBio] = useState(bio ?? "");
  const [instagram, setInstagram] = useState(instagramUrl ?? "");
  const [youtube, setYoutube] = useState(youtubeUrl ?? "");
  const [avatarIntent, setAvatarIntent] = useState<
    "keep" | "replace" | "remove"
  >("keep");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "preparing" | "uploading" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const preview = uploaded ?? (avatarIntent === "remove" ? null : avatar);
  const busy =
    pending || uploadStatus === "preparing" || uploadStatus === "uploading";

  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
      router.refresh();
    } else if (state.status === "error") {
      toast(state.message, "error");
      const firstField = Object.keys(state.fieldErrors ?? {})[0];
      if (firstField) {
        window.requestAnimationFrame(() => {
          const fieldIds: Record<string, string> = {
            displayName: "profile-display-name",
            username: "profile-username",
            bio: "profile-bio",
            instagramUrl: "profile-instagram",
            youtubeUrl: "profile-youtube",
          };
          const target = document.getElementById(
            fieldIds[firstField] ?? firstField,
          );
          if (!target) return;
          target.focus({ preventScroll: true });
          target.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "center",
          });
        });
      }
    }
  }, [onSuccess, router, state]);

  async function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploadStatus("preparing");
    try {
      const { preparePhoto } = await import("../../lib/photo-normalization");
      const prepared = await preparePhoto(file);
      setUploadStatus("uploading");
      const body = new FormData();
      body.set("uploadRequestId", crypto.randomUUID());
      body.set("slot", "0");
      body.set("file", prepared, "profile.jpg");
      const response = await fetch("/api/uploads", { method: "POST", body });
      const result = (await response.json()) as UploadedAvatar & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          result.message || "The profile image could not be uploaded.",
        );
      if (uploaded)
        void fetch(`/api/uploads/${encodeURIComponent(uploaded.id)}`, {
          method: "DELETE",
        });
      setUploaded(result);
      setAvatarIntent("replace");
      setUploadStatus("idle");
    } catch (error) {
      setUploadStatus("error");
      setUploadError(
        error instanceof Error
          ? error.message
          : "The profile image could not be uploaded.",
      );
    }
  }

  function removeAvatar() {
    if (uploaded)
      void fetch(`/api/uploads/${encodeURIComponent(uploaded.id)}`, {
        method: "DELETE",
      });
    setUploaded(null);
    setAvatarIntent("remove");
    setUploadStatus("idle");
    setUploadError("");
  }

  return (
    <form action={action} className="profile-form">
      <div className="profile-photo-field">
        <ProfileAvatar
          name={displayName || name}
          avatar={preview}
          className="profile-editor-avatar"
          sizes="88px"
        />
        <div>
          <input
            ref={fileRef}
            className="visually-hidden-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose a profile image"
            tabIndex={-1}
            onChange={chooseAvatar}
          />
          <div className="row profile-photo-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={17} aria-hidden="true" />
              {preview ? "Replace image" : "Choose image"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="quiet"
                className="danger-action"
                disabled={busy}
                onClick={removeAvatar}
              >
                <Trash2 size={17} aria-hidden="true" /> Remove
              </Button>
            )}
          </div>
          <p className="small muted">JPEG, PNG, or WebP up to 20 MB.</p>
          {(uploadStatus === "preparing" || uploadStatus === "uploading") && (
            <p className="small" role="status">
              {uploadStatus === "preparing"
                ? "Preparing image…"
                : "Uploading and verifying…"}
            </p>
          )}
          {uploadError && (
            <p className="field-error" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      <input type="hidden" name="avatarIntent" value={avatarIntent} />
      <input type="hidden" name="avatarId" value={uploaded?.id ?? ""} />

      <Field
        id="profile-display-name"
        label="Display name"
        error={state.fieldErrors?.displayName?.[0]}
      >
        <Input
          id="profile-display-name"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={50}
          required
          autoComplete="name"
          aria-invalid={!!state.fieldErrors?.displayName}
          aria-describedby={
            state.fieldErrors?.displayName
              ? "profile-display-name-error"
              : undefined
          }
        />
      </Field>

      <Field
        id="profile-username"
        label="Username"
        error={state.fieldErrors?.username?.[0]}
      >
        <Input
          id="profile-username"
          name="username"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          minLength={3}
          maxLength={36}
          pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{1,34}[A-Za-z0-9])?"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!state.fieldErrors?.username}
          aria-describedby={`profile-username-help${state.fieldErrors?.username ? " profile-username-error" : ""}`}
        />
        <p id="profile-username-help" className="small muted field-help">
          Your unique public identity. Letters, numbers, and internal hyphens.
        </p>
      </Field>

      <div className="profile-form-section">
        <h3>About you</h3>
        <Field
          id="profile-bio"
          label="Bio"
          optional
          error={state.fieldErrors?.bio?.[0]}
        >
          <Textarea
            id="profile-bio"
            name="bio"
            value={profileBio}
            onChange={(event) => setProfileBio(event.target.value)}
            maxLength={160}
            rows={3}
            placeholder="A little about how you travel"
            aria-invalid={!!state.fieldErrors?.bio}
            aria-describedby={
              state.fieldErrors?.bio ? "profile-bio-error" : undefined
            }
          />
          <p className="profile-character-count small muted">
            {Array.from(profileBio).length} / 160
          </p>
        </Field>
      </div>

      <div className="profile-form-section">
        <h3>Social profiles</h3>
        <p className="small muted profile-section-helper">
          Optional links other travellers can use to find you.
        </p>
        <Field
          id="profile-instagram"
          label="Instagram"
          optional
          error={state.fieldErrors?.instagramUrl?.[0]}
        >
          <Input
            id="profile-instagram"
            name="instagramUrl"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            placeholder="@username or Instagram URL"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!state.fieldErrors?.instagramUrl}
            aria-describedby={
              state.fieldErrors?.instagramUrl
                ? "profile-instagram-error"
                : undefined
            }
          />
        </Field>
        <Field
          id="profile-youtube"
          label="YouTube"
          optional
          error={state.fieldErrors?.youtubeUrl?.[0]}
        >
          <Input
            id="profile-youtube"
            name="youtubeUrl"
            value={youtube}
            onChange={(event) => setYoutube(event.target.value)}
            placeholder="@handle or YouTube URL"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!state.fieldErrors?.youtubeUrl}
            aria-describedby={
              state.fieldErrors?.youtubeUrl
                ? "profile-youtube-error"
                : undefined
            }
          />
        </Field>
      </div>

      <div className="profile-form-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" busy={busy}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function AccountProfileEditor({
  id,
  name,
  username,
  avatar,
  bio,
  instagramUrl,
  youtubeUrl,
  children,
}: {
  id: string;
  name: string;
  username: string;
  avatar: ProfileAvatarData;
  bio: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="account-profile">
        <ProfileAvatar
          name={name}
          avatar={avatar}
          className="account-avatar"
          sizes="52px"
        />
        <div>
          <strong>{name}</strong>
          <span className="profile-handle">@{username}</span>
        </div>
        <div className="account-profile-actions">
          <Button type="button" variant="quiet" onClick={() => setOpen(true)}>
            <Pencil size={16} aria-hidden="true" /> Edit profile
          </Button>
          <Link className="quiet" href={`/users/${id}`}>
            View public profile
          </Link>
        </div>
        <div className="account-profile-session">{children}</div>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        className="profile-dialog"
        title="Edit profile"
        description="Your profile details and image appear publicly with your tips."
      >
        {open && (
          <ProfileForm
            name={name}
            username={username}
            avatar={avatar}
            bio={bio}
            instagramUrl={instagramUrl}
            youtubeUrl={youtubeUrl}
            onCancel={() => setOpen(false)}
            onSuccess={() => {
              toast("Profile updated.");
              setOpen(false);
            }}
          />
        )}
      </Dialog>
    </>
  );
}
