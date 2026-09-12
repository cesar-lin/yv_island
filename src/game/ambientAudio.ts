// 环境音：宁静的海浪 + 远处微风，全部实时合成，不需要音频文件
// 默认静音，首次手动开启后一直播放
//
// 设计参考成熟的噪音生成器做法：
// - 粉噪音（1/f 频谱）而非白噪音：高频能量自然衰减，听感柔和（Paul Kellet 经典算法）
// - 慢速随机游走调制替代正弦 LFO：无周期性，像真的潮汐与阵风

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
    b2 = 0.96900 * b2 + w * 0.1538520
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

  const running: { src: AudioBufferSourceNode; oscs: AudioBufferSourceNode[] }[] = []

  // 慢速随机起伏控制源：随机游走 + 重度平滑，主能量在 0.02~0.3Hz（几秒到几十秒的缓慢无规则起伏）
  // 各层用不同长度，叠加后永不明显重复
  function makeCtl(seconds: number): AudioBufferSourceNode {
    const sr = ctx.sampleRate
    const buf = ctx.createBuffer(1, sr * seconds, sr)
    const d = buf.getChannelData(0)
    let v = 0
    let cur = 0
    for (let i = 0; i < d.length; i++) {
      v += (Math.random() * 2 - 1) * 0.0002 // 高频随机源
      v *= 0.9995 // 轻微回拉，防止漂移
      cur += (v - cur) * 0.00015 // 重平滑 → 极慢起伏
      d[i] = cur
    }
    let max = 0
    for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]))
    if (max > 0) for (let i = 0; i < d.length; i++) d[i] /= max
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.start(0, Math.random() * seconds)
    return src
  }

  // 一层「过滤粉噪音 + 随机游走起伏」，depth 为音量起伏幅度（0..1）
  function addLayer(
    type: BiquadFilterType,
    freq: number,
    q: number,
    gainValue: number,
    depth: number,
    ctlSeconds: number,
    wobble = 0,
    pan = 0
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

    // 随机游走控制音量：base*(1±depth)，永远为正
    const ctl = makeCtl(ctlSeconds)
    const depthGain = ctx.createGain()
    depthGain.gain.value = gainValue * depth
    ctl.connect(depthGain)
    depthGain.connect(g.gain)

    src.connect(filt)
    filt.connect(g)

    const ctls = [ctl]
    if (wobble > 0) {
      // 滤波频率缓慢摆动 ±25%，风声忽远忽近
      const wobGain = ctx.createGain()
      wobGain.gain.value = freq * wobble
      ctl.connect(wobGain)
      wobGain.connect(filt.frequency)
    }

    let tail: AudioNode = g
    if (pan !== 0) {
      const p = ctx.createStereoPanner()
      p.pan.value = pan
      g.connect(p)
      tail = p
    }
    tail.connect(master)

    src.start(0, Math.random() * 4) // 随机相位，各层互不相关
    running.push({ src, oscs: ctls })
  }

  // 海浪主体：180Hz 以下的低闷涌浪，约半分钟一次起落
  addLayer('lowpass', 180, 0.5, 0.5, 0.65, 41)
  // 深海底鸣：更深的第二层，让声音有厚度
  addLayer('lowpass', 90, 0.5, 0.28, 0.5, 53, 0, -0.35)
  // 远处微风：380Hz 窄带，极轻，缓缓飘荡
  addLayer('bandpass', 380, 0.5, 0.08, 0.6, 47, 0.25, 0.35)

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
