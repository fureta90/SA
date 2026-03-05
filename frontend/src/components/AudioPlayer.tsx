import React, { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  title: string
  onClose?: () => void
  audioRef?: React.RefObject<HTMLAudioElement>
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, onClose, audioRef: externalRef }) => {
  const internalRef                     = useRef<HTMLAudioElement>(null)
  const audioRef                        = externalRef ?? internalRef
  const progressRef                     = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [currentTime, setCurrentTime]   = useState(0)
  const [duration, setDuration]         = useState(0)
  const [volume, setVolume]             = useState(1)
  const [muted, setMuted]               = useState(false)
  const [isDragging]                    = useState(false)
  const [speed, setSpeed]               = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    setIsPlaying(!audio.paused)
    setCurrentTime(audio.currentTime)
    if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration)
    setSpeed(audio.playbackRate || 1)

    const onTimeUpdate  = () => !isDragging && setCurrentTime(audio.currentTime)
    const onDuration    = () => setDuration(audio.duration)
    const onEnded       = () => setIsPlaying(false)
    const onPlay        = () => setIsPlaying(true)
    const onPause       = () => setIsPlaying(false)

    audio.addEventListener('timeupdate',      onTimeUpdate)
    audio.addEventListener('loadedmetadata',  onDuration)
    audio.addEventListener('ended',           onEnded)
    audio.addEventListener('play',            onPlay)
    audio.addEventListener('pause',           onPause)

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('ended',          onEnded)
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
    }
  }, [isDragging, audioRef])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    isPlaying ? audio.pause() : audio.play()
  }

  const skip = (secs: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + secs))
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const audio = audioRef.current
    if (!bar || !audio) return
    const rect = bar.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * audio.duration
    setCurrentTime(audio.currentTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    setMuted(v === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !muted
    setMuted(!muted)
  }

  // Cicla al siguiente valor en SPEEDS con cada click
  const cycleSpeed = () => {
    const audio = audioRef.current
    if (!audio) return
    const idx       = SPEEDS.indexOf(speed)
    const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length]
    audio.playbackRate = nextSpeed
    setSpeed(nextSpeed)
  }

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="audio-player">
      {!externalRef && (
        <audio ref={internalRef} src={src} preload="metadata" />
      )}

      {/* Waveform decorativa */}
      <div className="audio-player__wave" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className={`audio-player__bar${isPlaying ? ' audio-player__bar--active' : ''}`}
            style={{ animationDelay: `${(i * 0.07) % 0.9}s`, height: `${8 + Math.sin(i * 0.8) * 8 + Math.cos(i * 1.3) * 5}px` }}
          />
        ))}
      </div>

      {/* Info */}
      <div className="audio-player__info">
        <p className="audio-player__title">{title}</p>
        <span className="audio-player__time">{fmt(currentTime)} / {fmt(duration)}</span>
      </div>

      {/* Controles */}
      <div className="audio-player__controls">
        <button className="audio-player__btn" onClick={() => skip(-10)} title="−10s">
          <SkipBack size={15} />
        </button>
        <button className="audio-player__btn audio-player__btn--play" onClick={togglePlay}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="audio-player__btn" onClick={() => skip(10)} title="+10s">
          <SkipForward size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="audio-player__progress-wrap">
        <div ref={progressRef} className="audio-player__progress" onClick={handleProgressClick}>
          <div className="audio-player__progress-fill" style={{ width: `${progress}%` }}>
            <div className="audio-player__progress-thumb" />
          </div>
        </div>
      </div>

      {/* Volumen + Velocidad */}
      <div className="audio-player__volume">
        <button className="audio-player__btn audio-player__btn--sm" onClick={toggleMute}>
          {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min={0} max={1} step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="audio-player__volume-slider"
        />
        <button
          className={`audio-player__speed${speed !== 1 ? ' audio-player__speed--active' : ''}`}
          onClick={cycleSpeed}
          title={`Velocidad: ${speed}× — click para cambiar`}
        >
          {speed === 1 ? '1×' : `${speed}×`}
        </button>
      </div>

      {onClose && (
        <button className="audio-player__close" onClick={onClose} title="Cerrar">
          <X size={14} />
        </button>
      )}
    </div>
  )
}