import { useEffect, useState } from "react";
import { resolveAvatarUrl } from "@/services/sms";

interface AvatarProps {
  path?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Renders a stored avatar (private bucket path or URL) with an initials fallback. */
export function Avatar({ path, name, size = 40, className = "" }: AvatarProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resolveAvatarUrl(path ?? null)
      .then((resolved) => active && setUrl(resolved))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [path]);

  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name} profile photo` : "Profile photo"}
        width={size}
        height={size}
        className={`sms-avatar ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`sms-avatar d-inline-grid bg-primary-subtle text-primary fw-semibold ${className}`}
      style={{ width: size, height: size, placeItems: "center", fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
