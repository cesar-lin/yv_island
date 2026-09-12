// 环境音：海浪涌动 + 远处风 / 空气感
// 全部用白噪音实时合成（过滤 + 慢速起伏），不需要任何音频文件

export interface AmbientAudioHandle {
  setMuted: (muted: boolean) => void
  dispose: () => void
}

const MASTER_LEVEL = 0.85

export function createAmbientAudio(): AmbientAudioHandle {
  const ctx = new AudioContext()

  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // 共享的白噪音缓冲（4 秒立体声，循环播放听不出接缝）
  const noiseBuf = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = noiseBuf.getChannelData(ch)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }

  const running: { src: AudioBufferSourceNode; oscs: OscillatorNode[] }[] = []

  // 一层「过滤白噪音 + 慢速音量起伏」，lfoRate/lfoDepth 控制涌动节奏
  function addLayer(
    type: BiquadFilterType,
    freq: number,
    q: number,
    gainValue: number,
    lfoRate: number,
    lfoDepth: number,
    freqWobble = 0
  ) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    src.loop = true

    const filt = ctx.createBiquadFilter()
    filt.type = type
    filt.frequency.value = freq
    filt.Q.value = q

    const g = ctx.createGain()
    g.gain.value = gainValue

    // 慢速 LFO 让音量起伏，像一波波涌来的浪 / 一阵阵的风
    const lfo = ctx.createOscillator()
    lfo.frequency.value = lfoRate
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = lfoDepth
    lfo.connect(lfoGain)
    lfoGain.connect(g.gain)

    src.connect(filt)
    filt.connect(g)
    g.connect(master)

    const oscs = [lfo]
    if (freqWobble > 0) {
      // 滤波频率缓慢摆动，风声会有忽远忽近的飘荡感
      const wob = ctx.createOscillator()
      wob.frequency.value = freqWobble
      const wobGain = ctx.createGain()
      wobGain.gain.value = freq * 0.25
      wob.connect(wobGain)
      wobGain.connect(filt.frequency)
      oscs.push(wob)
    }

    src.start(0, Math.random() * 4) // 随机相位，各层互不相关
    for (const o of oscs) o.start()
    running.push({ src, oscs })
  }

  // 海浪主体：低沉涌浪，约 12 秒一个涌动周期
  addLayer('lowpass', 260, 0.6, 0.42, 0.085, 0.26)
  // 浪花嘶声：薄薄的高频，起伏更快
  addLayer('bandpass', 1600, 0.8, 0.06, 0.21, 0.035)
  // 远处的风 / 空气感：中空滤波 + 频率飘荡
  addLayer('bandpass', 520, 0.4, 0.12, 0.05, 0.06, 0.033)

  // 浏览器禁止自动发声：等第一次点击/按键后再淡入，之后一直播放
  let started = false
  let muted = false
  const start = () => {
    if (started) return
    started = true
    window.removeEventListener('pointerdown', start)
    window.removeEventListener('keydown', start)
    void ctx.resume().then(() => {
      master.gain.setValueAtTime(0, ctx.currentTime)
      master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_LEVEL, ctx.currentTime + 3.5)
    })
  }
  window.addEventListener('pointerdown', start)
  window.addEventListener('keydown', start)

  return {
    setMuted(m: boolean) {
      muted = m
      if (!started) return
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(m ? 0 : MASTER_LEVEL, ctx.currentTime + 0.4)
    },
    dispose() {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      setTimeout(() => void ctx.close(), 400)
    },
  }
}
