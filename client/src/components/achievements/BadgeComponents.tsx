/**
 * Kinetic Pixel Fitness Achievements: Consolidated Badge & Reward Components
 * Includes PixelBadge, BadgeShareSheet, and BadgeUnlockOverlay.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Award, ArrowRight, Check, Copy, Download, ExternalLink, Send, Share2, X } from "lucide-react";
import { toast } from "sonner";
import type { Achievement } from "@/lib/rewards-data";
import { exportBadgeCertificate } from "@/lib/badge-certificate";

// =============================================================================
// 1. PIXEL BADGE EMBLEM
// =============================================================================

export type PixelBadgeProps = {
  achievement: Achievement;
  unlocked?: boolean;
  compact?: boolean;
  action?: ReactNode;
};

export function PixelBadge({
  achievement,
  unlocked = achievement.unlocked,
  compact = false,
  action,
}: PixelBadgeProps) {
  const progress = Math.min(
    100,
    Math.round((achievement.progress / achievement.target) * 100)
  );

  return (
    <article
      className={`achievement-badge ${unlocked ? "unlocked" : "locked"} ${
        compact ? "compact" : ""
      }`}
    >
      <div className="badge-emblem" data-kind={achievement.kind}>
        <i />
        <i />
        <i />
        <i />
        <b />
      </div>
      <div className="badge-copy">
        <div className="badge-topline">
          <span>{unlocked ? "Unlocked" : `${progress}% signal`}</span>
          {!compact && <em>{achievement.reward}</em>}
        </div>
        <h3>{achievement.title}</h3>
        {!compact && <p>{achievement.description}</p>}
        {!compact && (
          <div className="badge-footer-row">
            <div className="badge-progress">
              <i>
                <b style={{ width: `${progress}%` }} />
              </i>
              <small>
                {achievement.progress.toLocaleString()} /{" "}
                {achievement.target.toLocaleString()}
              </small>
            </div>
            {action && <div className="badge-action-slot">{action}</div>}
          </div>
        )}
      </div>
    </article>
  );
}

// =============================================================================
// 2. BADGE SHARE SHEET
// =============================================================================

export type BadgeShareSheetProps = {
  achievement: Achievement;
  onClose: () => void;
};

const makeMessage = (achievement: Achievement) =>
  `I unlocked the ${achievement.title} badge in FitTrack. ${achievement.description} Train the system. See the signal. #FitTrack #TrainTheSignal`;

export function BadgeShareSheet({ achievement, onClose }: BadgeShareSheetProps) {
  const [message, setMessage] = useState(() => makeMessage(achievement));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMessage(makeMessage(achievement));
    setCopied(false);
  }, [achievement]);

  const copy = async () => {
    await navigator.clipboard?.writeText(message);
    setCopied(true);
    toast("Achievement message copied — ready to post");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${achievement.title} — FitTrack`, text: message });
      } catch {
        /* User cancellation needs no error state. */
      }
    } else {
      await copy();
    }
  };

  const shareToX = () =>
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer,width=650,height=520"
    );

  const certificate = () => {
    exportBadgeCertificate(achievement);
    toast("Visual certificate exported as a PNG card");
  };

  return (
    <div className="share-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="badge-share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="sheet-close" onClick={onClose} aria-label="Close sharing panel">
          <X size={18} />
        </button>
        <div className="share-sheet-grid">
          <PixelBadge achievement={achievement} unlocked />
          <div>
            <span className="eyebrow">Share achievement</span>
            <h2 id="share-title">Broadcast the work</h2>
            <p>
              Personalize the message, then share the unlocked signal from your device or preferred social channel.
            </p>
            <label className="share-message">
              <span>Custom message</span>
              <textarea
                value={message}
                maxLength={240}
                onChange={(event) => setMessage(event.target.value)}
              />
              <small>{message.length}/240</small>
            </label>
            <div className="share-actions">
              <button className="native-share" onClick={nativeShare}>
                <Share2 size={16} />Share with device
              </button>
              <button onClick={shareToX}>
                <Send size={15} />Post to X
              </button>
              <button onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy message"}
              </button>
            </div>
            <button className="certificate-export" onClick={certificate}>
              <Download size={15} />Export visual certificate <span>PNG</span>
            </button>
            <a
              className="share-note"
              href="https://github.com/ANIKETCHAND/fit"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} />FitTrack Open Source Project
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// 3. BADGE UNLOCK OVERLAY
// =============================================================================

export type BadgeUnlockOverlayProps = {
  achievement: Achievement;
  onClose: () => void;
  onShare: () => void;
};

export function BadgeUnlockOverlay({ achievement, onClose, onShare }: BadgeUnlockOverlayProps) {
  return (
    <div className="unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="pixel-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ "--piece": index } as React.CSSProperties} />
        ))}
      </div>
      <section className="unlock-console">
        <div className="unlock-topline">
          <span><i />Achievement signal captured</span>
          <span>REW / 01</span>
        </div>
        <Award className="unlock-mark" size={31} />
        <span className="eyebrow">New badge unlocked</span>
        <h2 id="unlock-title">{achievement.title}</h2>
        <p>{achievement.description}</p>
        <PixelBadge achievement={achievement} unlocked />
        <div className="unlock-actions">
          <button className="unlock-share" onClick={onShare}>
            <Share2 size={16} />Share the signal
          </button>
          <button onClick={onClose}>
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
