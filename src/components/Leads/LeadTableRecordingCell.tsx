"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spin, Tooltip, message } from "antd";
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { VoiceRecording } from "@/lib/voice-recordings";
import { MAX_VOICE_RECORDINGS_PER_LEAD } from "@/lib/voice-recordings";

type LeadTableRecordingCellProps = {
  leadId: string;
  leadEmail?: string | null;
  initialRecordings?: VoiceRecording[];
  onRecordingsChange?: () => void;
};

export function LeadTableRecordingCell({
  leadId,
  leadEmail,
  initialRecordings,
  onRecordingsChange,
}: LeadTableRecordingCellProps) {
  const playTooltip = leadEmail?.trim() || "No email";
  const [recordings, setRecordings] = useState<VoiceRecording[]>(initialRecordings ?? []);
  const [loading, setLoading] = useState(!initialRecordings);
  const [uploading, setUploading] = useState(false);
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/leads/${leadId}/voice-lock`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(json?.error || "Failed to load recordings");
        return;
      }
      setRecordings((json.recordings ?? []) as VoiceRecording[]);
    } catch {
      message.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (initialRecordings !== undefined) {
      setRecordings(initialRecordings);
      setLoading(false);
    }
  }, [initialRecordings]);

  useEffect(() => {
    if (initialRecordings === undefined) {
      void refreshRecordings();
    }
  }, [initialRecordings, refreshRecordings]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingPath(null);
  };

  const togglePlay = (rec: VoiceRecording) => {
    if (!rec.url) {
      message.warning("Playback unavailable for this file");
      return;
    }

    if (playingPath === rec.path) {
      stopPlayback();
      return;
    }

    stopPlayback();
    const audio = new Audio(rec.url);
    audioRef.current = audio;
    audio.onended = () => setPlayingPath(null);
    audio.onerror = () => {
      message.error("Could not play recording");
      setPlayingPath(null);
    };
    void audio.play().then(() => setPlayingPath(rec.path)).catch(() => {
      message.error("Could not play recording");
      setPlayingPath(null);
    });
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (recordings.length >= MAX_VOICE_RECORDINGS_PER_LEAD) {
      message.warning(`Maximum ${MAX_VOICE_RECORDINGS_PER_LEAD} recordings per lead`);
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch(`/api/agent/leads/${leadId}/voice-lock/presign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "audio/mpeg",
        }),
      });
      const presignJson = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) {
        message.error(presignJson?.error || "Failed to prepare upload");
        return;
      }

      const { signedUrl } = presignJson as { signedUrl: string };
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "audio/mpeg" },
        body: file,
      });
      if (!uploadRes.ok) {
        message.error("Upload failed");
        return;
      }

      message.success("Recording uploaded");
      await refreshRecordings();
      onRecordingsChange?.();
    } catch {
      message.error("Failed to upload recording");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const canUpload = recordings.length < MAX_VOICE_RECORDINGS_PER_LEAD;

  const iconBtnStyle = { width: 24, height: 24, padding: 0, minWidth: 24 } as const;

  if (loading) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 24 }}
      >
        <Spin size="small" />
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        maxWidth: "100%",
        minHeight: 24,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void handleUpload(file);
        }}
      />

      {recordings.length === 0 ? (
        <Tooltip title="Upload recording">
          <Button
            type="dashed"
            size="small"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={iconBtnStyle}
            aria-label="Upload recording"
          />
        </Tooltip>
      ) : (
        <>
          {recordings.map((rec) => {
            const isPlaying = playingPath === rec.path;
            return (
              <Tooltip key={rec.path} title={playTooltip}>
                <Button
                  type="text"
                  size="small"
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={() => togglePlay(rec)}
                  style={{
                    ...iconBtnStyle,
                    color: isPlaying ? "#1677ff" : undefined,
                  }}
                  aria-label={isPlaying ? `Pause ${playTooltip}` : `Play ${playTooltip}`}
                />
              </Tooltip>
            );
          })}
          {canUpload && (
            <Tooltip title="Add recording">
              <Button
                type="dashed"
                size="small"
                icon={<UploadOutlined />}
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
                style={iconBtnStyle}
                aria-label="Upload recording"
              />
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}
