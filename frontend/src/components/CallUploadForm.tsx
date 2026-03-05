import React, { FormEvent, useRef, useState } from 'react'
import { Clock, FileAudio, Hash, Phone, Upload, User, X } from 'lucide-react'
import Swal from 'sweetalert2'
import { Modal } from './Modal'
import { callsService } from '../services/calls.service'
import { DateTimeField } from './DatePicker'
import type { CreateCallDto } from '../types/calls.types'
import { useLang } from '../context/LangContext'

interface CallUploadFormProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  onSuccess: () => void
}

export const CallUploadForm: React.FC<CallUploadFormProps> = ({
  isOpen, onClose, campaignId, onSuccess,
}) => {
  const { t } = useLang()
  const [audioFile, setAudioFile]       = useState<File | null>(null)
  const [nombreGrabacion, setNombre]    = useState('')
  const [usuarioLlamada, setUsuario]    = useState('')
  const [fechaInicio, setFechaInicio]   = useState('')
  const [fechaFin, setFechaFin]         = useState('')
  const [idLlamada, setIdLlamada]       = useState('')
  const [idContacto, setIdContacto]     = useState('')
  const [duracion, setDuracion]         = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOver, setDragOver]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setAudioFile(file)
    if (!nombreGrabacion) setNombre(file.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleReset = () => {
    setAudioFile(null); setNombre(''); setUsuario('')
    setFechaInicio(''); setFechaFin(''); setIdLlamada('')
    setIdContacto(''); setDuracion('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => { handleReset(); onClose() }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!audioFile || !nombreGrabacion.trim()) return
    setIsSubmitting(true)
    try {
      const dto: CreateCallDto = {
        campaignId,
        nombreGrabacion:    nombreGrabacion.trim(),
        usuarioLlamada:     usuarioLlamada  || undefined,
        fechaInicioLlamada: fechaInicio     || undefined,
        fechaFinLlamada:    fechaFin        || undefined,
        idLlamada:          idLlamada       || undefined,
        idContacto:         idContacto      || undefined,
        duracionSegundos:   duracion ? parseInt(duracion) : undefined,
      }
      await callsService.create(dto, audioFile)
      handleReset()
      onSuccess()
      onClose()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || t.speech.upload,
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatBytes = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.speech.newAudio} size="lg">
      <form onSubmit={handleSubmit} className="call-upload-form">

        {/* Drop zone */}
        {!audioFile ? (
          <div
            className={`call-upload-dropzone${dragOver ? ' call-upload-dropzone--over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="call-upload-dropzone__icon"><Upload size={26}/></div>
            <p className="call-upload-dropzone__title">
              {t.speech.selectAudio}
            </p>
            <p className="call-upload-dropzone__hint">{t.speech.audioFormats}</p>
          </div>
        ) : (
          <div className="call-upload-file">
            <div className="call-upload-file__icon"><FileAudio size={20}/></div>
            <div className="call-upload-file__info">
              <p className="call-upload-file__name">{audioFile.name}</p>
              <p className="call-upload-file__size">{formatBytes(audioFile.size)}</p>
            </div>
            <button type="button" className="call-upload-file__remove"
              onClick={() => { setAudioFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              title="Quitar archivo">
              <X size={14}/>
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>

        {/* Nombre */}
        <div className="form-group">
          <label className="form-group__label">{t.labels.name} *</label>
          <FileAudio size={18} className="form-group__icon"/>
          <input type="text" placeholder="Ej: Llamada comercial 001"
            value={nombreGrabacion} onChange={(e) => setNombre(e.target.value)}
            className="form-group__input" required/>
          <div className="form-group__line"/>
        </div>

        {/* Grid campos opcionales */}
        <div className="call-upload-form__grid">
          {/* Fechas con DateTimeField — sin ícono nativo del browser */}
            <DateTimeField
              label="Inicio llamada"
              value={fechaInicio}
              onChange={setFechaInicio}
            />

            <DateTimeField
              label="Fin llamada"
              value={fechaFin}
              onChange={setFechaFin}
              minDate={fechaInicio ? fechaInicio.split('T')[0] : undefined}
            />

            
          <div className="form-group">
            <label className="form-group__label">{t.labels.username}</label>
            <User size={18} className="form-group__icon"/>
            <input type="text" placeholder="Agente o usuario" value={usuarioLlamada}
              onChange={(e) => setUsuario(e.target.value)} className="form-group__input"/>
            <div className="form-group__line"/>
          </div>

          <div className="form-group">
            <label className="form-group__label">{t.speech.duration} (seg)</label>
            <Clock size={18} className="form-group__icon"/>
            <input type="number" placeholder="Ej: 180" value={duracion} min={0}
              onChange={(e) => setDuracion(e.target.value)} className="form-group__input"/>
            <div className="form-group__line"/>
          </div>

          <div className="form-group">
            <label className="form-group__label">ID Llamada</label>
            <Hash size={18} className="form-group__icon"/>
            <input type="text" placeholder="ID del sistema" value={idLlamada}
              onChange={(e) => setIdLlamada(e.target.value)} className="form-group__input"/>
            <div className="form-group__line"/>
          </div>

          <div className="form-group">
            <label className="form-group__label">ID Contacto</label>
            <Phone size={18} className="form-group__icon"/>
            <input type="text" placeholder="ID del contacto" value={idContacto}
              onChange={(e) => setIdContacto(e.target.value)} className="form-group__input"/>
            <div className="form-group__line"/>
          </div>

          

        </div>

        {/* Footer */}
        <div className="call-upload-form__footer">
          <button type="submit" className="btn btn-primary"
            disabled={isSubmitting || !audioFile || !nombreGrabacion.trim()}>
            <Upload size={15}/>
            {isSubmitting ? t.actions.saving : t.speech.upload}
          </button>
          <button type="button" onClick={handleClose} className="btn btn-secondary">
            {t.actions.cancel}
          </button>
        </div>

      </form>
    </Modal>
  )
}