// 环境音：宁静的海浪 + 远处微风，全部用白噪音实时合成，不需要音频文件
// 默认静音，首次手动开启后一直播放

export interface AmbientAudioHandle {
  setEnabled: (enabled: boolean) => void
  dispose: () => void
}

const MASTER_LEVEL = 0.8

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
  // 所有能量都压在 500Hz 以下，只有低缓的轰鸣感，没有沙沙的高频噪声
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

    // 慢速 LFO 让音量像潮汐一样缓缓起伏
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
      // 滤波频率极缓摆动，风声有忽远忽近的飘荡感
      const wob = ctx.createOscillator()
      wob.frequency.value = freqWobble
      const wobGain = ctx.createGain()
      wobGain.gain.value = freq * 0.2
      wob.connect(wobGain)
      wobGain.connect(filt.frequency)
      oscs.push(wob)
    }

    src.start(0, Math.random() * 4) // 随机相位，各层互不相关
    for (const o of oscs) o.start()
    running.push({ src, oscs })
  }

  // 海浪主体：低通到 200Hz 的闷响，约 20 秒一次缓慢涌动
  addLayer('lowpass', 200, 0.5, 0.4, 0.05, 0.24)
  // 远处的微风：窄带低鸣，约 50 秒一个阵风来回
  addLayer('bandpass', 320, 0.6, 0.09, 0.02, 0.045, 0.02)

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
