// 环境音：宁静的海浪，实时合成，不需要音频文件
// 默认静音，手动开启后一直播放
//
// 粉噪音（1/f 频谱，比白噪音柔和，Paul Kellet 经典算法）
// + 低通滤波只留低鸣 + 极缓随机游走调制涌动，无周期性

export interface AmbientAudioHandle {
  setEnabled: (enabled: boolean) => void
  dispose: () => void
}

const MASTER_LEVEL = 0.7

// Paul Kellet 的粉噪音近似算法（业界广泛使用的参考实现）
function fillPinkNoise(d: Float32Array) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
}

export function createAmbientAudio(): AmbientAudioHandle {
  const ctx = new AudioContext()

  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // 粉噪音缓冲（4 秒立体声，循环播放）
  const noiseBuf = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) fillPinkNoise(noiseBuf.getChannelData(ch))

  // 海浪：粉噪音低通成低鸣，音量随极缓的随机游走起伏（约几十秒一次涌落）
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true

  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = 200
  filt.Q.value = 0.5

  const g = ctx.createGain()
  g.gain.value = 0.6

  // 60 秒一循环的随机游走控制信号，主能量在 0.02~0.2Hz，无规律可循
  const ctlBuf = ctx.createBuffer(1, ctx.sampleRate * 60, ctx.sampleRate)
  const cd = ctlBuf.getChannelData(0)
  let v = 0
  let cur = 0
  for (let i = 0; i < cd.length; i++) {
    v += (Math.random() * 2 - 1) * 0.0002
    v *= 0.9995
    cur += (v - cur) * 0.00006 // 重平滑 → 极慢起伏
    cd[i] = cur
  }
  let max = 0
  for (let i = 0; i < cd.length; i++) max = Math.max(max, Math.abs(cd[i]))
  if (max > 0) for (let i = 0; i < cd.length; i++) cd[i] /= max

  const ctl = ctx.createBufferSource()
  ctl.buffer = ctlBuf
  ctl.loop = true
  const ctlGain = ctx.createGain()
  ctlGain.gain.value = 0.4 // 涌动幅度 ±0.4*0.6，永远为正
  ctl.connect(ctlGain)
  ctlGain.connect(g.gain)

  src.connect(filt)
  filt.connect(g)
  g.connect(master)
  src.start(0, Math.random() * 4)
  ctl.start(0, Math.random() * 60)

  // 浏览器禁止自动发声：默认静音，开启后等第一次点击/按键再淡入，之后一直播放
  let enabled = false

  function applyGain() {
    if (ctx.state === 'suspended') void ctx.resume()
    const target = enabled ? MASTER_LEVEL : 0
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + (enabled ? 4 : 0.5))
  }

  const onFirstGesture = () => {
    if (enabled) applyGain() // 播音状态下，首次手势触发淡入
  }
  window.addEventListener('pointerdown', onFirstGesture)
  window.addEventListener('keydown', onFirstGesture)

  return {
    setEnabled(on: boolean) {
      enabled = on
      applyGain() // 按钮点击本身就是一次用户手势，可以直接 resume
    },
    dispose() {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      setTimeout(() => void ctx.close(), 400)
    },
  }
}
