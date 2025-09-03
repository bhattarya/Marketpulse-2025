import { useEffect, useRef } from 'react'

export default function Sparkline({ data, symbol, width = 60, height = 30 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data || data.length === 0) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const canvasWidth = width
    const canvasHeight = height

    // Set canvas size
    canvas.width = canvasWidth * window.devicePixelRatio
    canvas.height = canvasHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)')
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)')

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'

    const stepX = canvasWidth / (data.length - 1)
    data.forEach((value, index) => {
      const x = index * stepX
      const y = canvasHeight - ((value - min) / range) * canvasHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Fill area under curve
    ctx.lineTo(canvasWidth, canvasHeight)
    ctx.lineTo(0, canvasHeight)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
  }, [data, width, height])

  if (!data || data.length === 0) {
    return <div className="w-15 h-8" />
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  )
}